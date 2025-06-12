import { prisma } from '@/app/_lib/prisma';
import { ScheduleStatus, PostingStrategy, Post, PostImage } from '@prisma/client';
import { RRule } from 'rrule';
import { postToInstagramStories, waitForRateLimit } from './InstagramService';
import { postToTwitter, uploadImageToTwitter } from './TwitterService';

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
        const selectedPost = await selectPostByStrategy(
          schedule.user.posts,
          schedule.strategy,
          schedule.id
        );

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
 * 投稿戦略に基づいて投稿を選択（自動循環機能付き）
 */
async function selectPostByStrategy(
  posts: PostWithImages[],
  strategy: PostingStrategy,
  scheduleId: string
): Promise<PostWithImages | null> {
  if (posts.length === 0) return null;

  // 画像を持つ投稿のみを対象とする
  const postsWithImages = posts.filter((post) => post.images.length > 0);
  if (postsWithImages.length === 0) return null;

  // スケジュール設定を取得
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule) return null;

  switch (strategy) {
    case PostingStrategy.RANDOM:
      return await selectRandomPost(postsWithImages, scheduleId, schedule.autoReset);

    case PostingStrategy.NEWEST_FIRST:
      return await selectNewestFirstPost(postsWithImages, scheduleId, schedule.autoReset);

    case PostingStrategy.OLDEST_FIRST:
      return await selectOldestFirstPost(postsWithImages, scheduleId, schedule.autoReset);

    default:
      return postsWithImages[0];
  }
}

/**
 * ランダム投稿選択（重複なし、自動循環機能付き）
 */
async function selectRandomPost(
  posts: PostWithImages[],
  scheduleId: string,
  autoReset: boolean
): Promise<PostWithImages | null> {
  // 投稿済みのPostを取得
  const postedPostIds = await prisma.scheduleEntry.findMany({
    where: {
      scheduleId: scheduleId,
      status: ScheduleStatus.POSTED,
    },
    select: { postId: true },
  });

  const postedIds = postedPostIds.map((entry) => entry.postId);

  // 未投稿のPostを取得
  const unpostedPosts = posts.filter((post) => !postedIds.includes(post.id));

  // 全て投稿済みの場合の処理
  if (unpostedPosts.length === 0) {
    if (autoReset) {
      await resetScheduleCycle(scheduleId);
      // リセット後は全てのPostが候補
      return posts[Math.floor(Math.random() * posts.length)];
    }
    return null; // 自動リセットが無効の場合は投稿しない
  }

  // ランダム選択
  return unpostedPosts[Math.floor(Math.random() * unpostedPosts.length)];
}

/**
 * 新しい順投稿選択（重複なし、自動循環機能付き）
 */
async function selectNewestFirstPost(
  posts: PostWithImages[],
  scheduleId: string,
  autoReset: boolean
): Promise<PostWithImages | null> {
  // 投稿済みのPostを取得
  const postedPostIds = await prisma.scheduleEntry.findMany({
    where: {
      scheduleId: scheduleId,
      status: ScheduleStatus.POSTED,
    },
    select: { postId: true },
  });

  const postedIds = postedPostIds.map((entry) => entry.postId);

  // 未投稿のPostを新しい順で取得
  const unpostedPosts = posts.filter((post) => !postedIds.includes(post.id));

  // 全て投稿済みの場合の処理
  if (unpostedPosts.length === 0) {
    if (autoReset) {
      await resetScheduleCycle(scheduleId);
      // リセット後は最新のPostを選択
      return posts[0];
    }
    return null;
  }

  // 最新のPostを選択
  return unpostedPosts[0];
}

/**
 * 古い順投稿選択（重複なし、自動循環機能付き）
 */
async function selectOldestFirstPost(
  posts: PostWithImages[],
  scheduleId: string,
  autoReset: boolean
): Promise<PostWithImages | null> {
  // 投稿済みのPostを取得
  const postedPostIds = await prisma.scheduleEntry.findMany({
    where: {
      scheduleId: scheduleId,
      status: ScheduleStatus.POSTED,
    },
    select: { postId: true },
  });

  const postedIds = postedPostIds.map((entry) => entry.postId);

  // 未投稿のPostを古い順で取得
  const unpostedPosts = posts
    .filter((post) => !postedIds.includes(post.id))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // 全て投稿済みの場合の処理
  if (unpostedPosts.length === 0) {
    if (autoReset) {
      await resetScheduleCycle(scheduleId);
      // リセット後は最古のPostを選択
      const sortedPosts = posts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      return sortedPosts[0];
    }
    return null;
  }

  // 最古のPostを選択
  return unpostedPosts[0];
}

/**
 * スケジュールサイクルのリセット
 */
async function resetScheduleCycle(scheduleId: string) {
  // 投稿済みエントリーを削除
  await prisma.scheduleEntry.deleteMany({
    where: {
      scheduleId: scheduleId,
      status: ScheduleStatus.POSTED,
    },
  });

  // リセット情報を更新
  await prisma.schedule.update({
    where: { id: scheduleId },
    data: {
      resetCount: { increment: 1 },
      lastResetAt: new Date(),
    },
  });

  console.log(`スケジュール ${scheduleId} のサイクルをリセットしました`);
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
        // ユーザーの連携状況を取得
        const userData = await prisma.user.findUnique({
          where: { id: entry.post.user.id },
          select: {
            instagramAccessToken: true,
            instagramBusinessAccountId: true,
            xAccessToken: true,
            xAccessTokenSecret: true,
            xUserId: true,
          },
        });

        const hasInstagram = !!(
          userData?.instagramAccessToken && userData?.instagramBusinessAccountId
        );
        const hasTwitter = !!(
          userData?.xAccessToken &&
          userData?.xAccessTokenSecret &&
          userData?.xUserId
        );

        if (!hasInstagram && !hasTwitter) {
          await prisma.scheduleEntry.update({
            where: { id: entry.id },
            data: {
              status: ScheduleStatus.FAILED,
              errorMessage: 'Instagram または X の連携が必要です',
            },
          });
          continue;
        }

        // レート制限を考慮した待機
        await waitForRateLimit();

        let instagramSuccess = false;
        let twitterSuccess = false;
        const errors: string[] = [];

        // Instagram投稿
        if (hasInstagram) {
          try {
            instagramSuccess = await postToInstagramStories(entry.post, entry.post.user.id);
            if (!instagramSuccess) {
              errors.push('Instagram投稿に失敗しました');
            }
          } catch (error) {
            errors.push(
              `Instagram投稿エラー: ${error instanceof Error ? error.message : '不明なエラー'}`
            );
          }
        }

        // Twitter投稿
        if (hasTwitter && entry.post.images.length > 0) {
          try {
            const firstImage = entry.post.images[0];
            const tweetText = firstImage.xText || entry.post.storyText || '';

            // 画像をTwitterにアップロード
            let mediaIds: string[] = [];
            try {
              const mediaId = await uploadImageToTwitter(firstImage.imageUrl, {
                accessToken: userData.xAccessToken!,
                accessTokenSecret: userData.xAccessTokenSecret!,
                userId: userData.xUserId!,
              });
              if (mediaId) {
                mediaIds = [mediaId];
              }
            } catch (uploadError) {
              console.error('Twitter画像アップロードエラー:', uploadError);
            }

            twitterSuccess = await postToTwitter(tweetText, mediaIds, entry.post.user.id);
            if (!twitterSuccess) {
              errors.push('X投稿に失敗しました');
            }
          } catch (error) {
            errors.push(`X投稿エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
          }
        }

        // 結果を判定
        if ((hasInstagram && instagramSuccess) || (hasTwitter && twitterSuccess)) {
          await prisma.scheduleEntry.update({
            where: { id: entry.id },
            data: {
              status: ScheduleStatus.POSTED,
              postedAt: now,
            },
          });

          const successMessages: string[] = [];
          if (instagramSuccess) successMessages.push('Instagram');
          if (twitterSuccess) successMessages.push('X');

          console.log(
            `投稿 ${entry.post.id} を${successMessages.join('と')}に投稿しました${errors.length > 0 ? ` (一部エラー: ${errors.join(', ')})` : ''}`
          );
        } else {
          await prisma.scheduleEntry.update({
            where: { id: entry.id },
            data: {
              status: ScheduleStatus.FAILED,
              errorMessage: errors.join(', '),
            },
          });
          console.error(`投稿 ${entry.post.id} の投稿に失敗しました: ${errors.join(', ')}`);
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

/**
 * スケジュールの統計情報を取得
 */
export async function getScheduleStats(scheduleId: string) {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: {
      user: {
        include: {
          posts: {
            where: {
              images: {
                some: {},
              },
            },
          },
        },
      },
      entries: {
        where: {
          status: ScheduleStatus.POSTED,
        },
      },
    },
  });

  if (!schedule) return null;

  const totalPosts = schedule.user.posts.length;
  const postedPosts = schedule.entries.length;
  const remainingPosts = totalPosts - postedPosts;

  // 現在のサイクルでの進捗率
  const currentCycleProgress = totalPosts > 0 ? (postedPosts / totalPosts) * 100 : 0;

  // 次回リセット予定（全投稿完了まであと何回投稿が必要か）
  const postsUntilReset = remainingPosts;

  return {
    totalPosts,
    postedPosts,
    remainingPosts,
    currentCycleProgress: Math.round(currentCycleProgress),
    resetCount: schedule.resetCount,
    lastResetAt: schedule.lastResetAt,
    autoReset: schedule.autoReset,
    postsUntilReset,
    isCompleted: remainingPosts === 0,
  };
}
