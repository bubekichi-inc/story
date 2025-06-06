import { prisma } from '@/app/_lib/prisma';
import { ScheduleStatus, PostingStrategy, Post, PostImage } from '@prisma/client';
import { RRule } from 'rrule';
import { postToInstagramStories, waitForRateLimit } from './InstagramService';

type PostWithImages = Post & {
  images: PostImage[];
};

/**
 * 定期スケジュールから新しいスケジュールエントリーを生成する
 * 通常はcronジョブで定期実行する
 */
export async function generateScheduleEntries() {
  try {
    const now = new Date();

    // 実行が必要なスケジュールを取得
    const schedules = await prisma.schedule.findMany({
      where: {
        isActive: true,
        nextRun: {
          lte: now,
        },
      },
      include: {
        user: {
          include: {
            posts: {
              include: {
                images: {
                  orderBy: { order: 'asc' },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    for (const schedule of schedules) {
      try {
        // 投稿戦略に基づいて投稿を選択
        const selectedPost = selectPostByStrategy(schedule.user.posts, schedule.strategy);

        if (selectedPost) {
          // スケジュールエントリーを作成
          await prisma.scheduleEntry.create({
            data: {
              scheduleId: schedule.id,
              postId: selectedPost.id,
              scheduledAt: schedule.nextRun!,
              status: ScheduleStatus.PENDING,
            },
          });
        }

        // 次回実行時刻を計算
        const nextRun = calculateNextRun(schedule.rrule);

        // スケジュールを更新
        await prisma.schedule.update({
          where: { id: schedule.id },
          data: { nextRun },
        });

        console.log(`スケジュール ${schedule.name} のエントリーを生成しました`);
      } catch (error) {
        console.error(`スケジュール ${schedule.name} のエントリー生成に失敗:`, error);
      }
    }

    console.log(`${schedules.length}件のスケジュールを処理しました`);
  } catch (error) {
    console.error('スケジュールエントリー生成エラー:', error);
  }
}

/**
 * 投稿戦略に基づいて投稿を選択
 */
function selectPostByStrategy(posts: PostWithImages[], strategy: PostingStrategy) {
  if (posts.length === 0) return null;

  // 画像を持つ投稿のみを対象とする
  const postsWithImages = posts.filter((post) => post.images.length > 0);
  if (postsWithImages.length === 0) return null;

  switch (strategy) {
    case PostingStrategy.RANDOM:
      return postsWithImages[Math.floor(Math.random() * postsWithImages.length)];

    case PostingStrategy.NEWEST_FIRST:
      return postsWithImages[0]; // 既にcreatedAt descでソート済み

    case PostingStrategy.OLDEST_FIRST:
      return postsWithImages[postsWithImages.length - 1];

    default:
      return postsWithImages[0];
  }
}

/**
 * RRuleから次回実行時刻を計算
 */
function calculateNextRun(rruleString: string | null): Date | null {
  if (!rruleString) return null;

  try {
    const rule = RRule.fromString(rruleString);
    const now = new Date();
    const nextOccurrence = rule.after(now);
    return nextOccurrence;
  } catch (error) {
    console.error('次回実行時刻の計算エラー:', error);
    return null;
  }
}

/**
 * 待機中のスケジュールエントリーをInstagramに投稿する
 * Vercelのcronで1分間隔で実行される
 */
export async function processScheduleEntries() {
  try {
    const now = new Date();
    const oneMinuteFromNow = new Date(now.getTime() + 1 * 60 * 1000);

    // 投稿予定時刻が現在から1分以内の待機中エントリーを取得
    const entries = await prisma.scheduleEntry.findMany({
      where: {
        status: ScheduleStatus.PENDING,
        scheduledAt: {
          lte: oneMinuteFromNow,
        },
      },
      include: {
        post: {
          include: {
            images: {
              orderBy: { order: 'asc' },
            },
            user: true,
          },
        },
        schedule: true,
      },
      orderBy: { scheduledAt: 'asc' },
      take: 5, // 1分間隔なので一度に最大5件まで処理
    });

    for (const entry of entries) {
      try {
        // レート制限を考慮した待機
        await waitForRateLimit();

        // 実際のInstagram API呼び出し
        const success = await postToInstagramStories(entry.post, entry.post.user.id);

        if (success) {
          await prisma.scheduleEntry.update({
            where: { id: entry.id },
            data: {
              status: ScheduleStatus.POSTED,
              postedAt: now,
            },
          });
          console.log(`投稿 ${entry.post.id} をInstagramに投稿しました`);
        } else {
          await prisma.scheduleEntry.update({
            where: { id: entry.id },
            data: {
              status: ScheduleStatus.FAILED,
              errorMessage: 'Instagram投稿に失敗しました',
            },
          });
          console.error(`投稿 ${entry.post.id} のInstagram投稿に失敗しました`);
        }
      } catch (error) {
        await prisma.scheduleEntry.update({
          where: { id: entry.id },
          data: {
            status: ScheduleStatus.FAILED,
            errorMessage: error instanceof Error ? error.message : '不明なエラー',
          },
        });
        console.error(`投稿 ${entry.post.id} の処理中にエラー:`, error);
      }
    }

    console.log(`${entries.length}件のスケジュールエントリーを処理しました`);
  } catch (error) {
    console.error('スケジュールエントリー処理エラー:', error);
  }
}

/**
 * 失敗したエントリーのリトライ処理
 */
export async function retryFailedEntries() {
  try {
    const failedEntries = await prisma.scheduleEntry.findMany({
      where: {
        status: ScheduleStatus.FAILED,
        // 24時間以内に失敗したもののみリトライ
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      include: {
        post: {
          include: {
            images: {
              orderBy: { order: 'asc' },
            },
            user: true,
          },
        },
      },
      take: 5, // 一度に最大5件まで処理
    });

    for (const entry of failedEntries) {
      try {
        // レート制限を考慮した待機
        await waitForRateLimit();

        const success = await postToInstagramStories(entry.post, entry.post.user.id);

        if (success) {
          await prisma.scheduleEntry.update({
            where: { id: entry.id },
            data: {
              status: ScheduleStatus.POSTED,
              postedAt: new Date(),
              errorMessage: null,
            },
          });
          console.log(`リトライ成功: 投稿 ${entry.post.id}`);
        } else {
          console.log(`リトライ失敗: 投稿 ${entry.post.id}`);
        }
      } catch (error) {
        console.error(`リトライ中にエラー: 投稿 ${entry.post.id}`, error);
      }
    }

    console.log(`${failedEntries.length}件の失敗エントリーをリトライしました`);
  } catch (error) {
    console.error('失敗エントリーのリトライエラー:', error);
  }
}
