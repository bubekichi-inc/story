'use server';

import { prisma } from '@/app/_lib/prisma';
import { createClient } from '@/app/_lib/supabase/server';
import { PostingStrategy, PostingScope, ScheduleStatus } from '@prisma/client';
import { RRule } from 'rrule';
import { revalidatePath } from 'next/cache';
import { postToInstagramStories } from '@/app/_services/InstagramService';
import { postToTwitter } from '@/app/_services/TwitterService';
import { ThreadsService } from '@/app/_services/ThreadsService';
import { getScheduleStats } from '@/app/_services/ScheduleService';

// スケジュール作成
export async function createSchedule(formData: {
  name: string;
  strategy: PostingStrategy;
  scope: PostingScope;
  selectedPostIds?: string[];
  rrule?: string;
  timezone?: string;
  autoReset?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('認証が必要です');
  }

  try {
    // 次回実行時刻を計算
    let nextRun: Date | null = null;
    if (formData.rrule) {
      const rule = RRule.fromString(formData.rrule);
      const now = new Date();
      const nextOccurrence = rule.after(now);
      nextRun = nextOccurrence;
    }

    const schedule = await prisma.schedule.create({
      data: {
        userId: user.id,
        name: formData.name,
        strategy: formData.strategy,
        scope: formData.scope,
        rrule: formData.rrule,
        timezone: formData.timezone || 'Asia/Tokyo',
        nextRun,
        autoReset: formData.autoReset ?? true,
      },
    });

    // スケジュールでSELECTEDが選択された場合、選択されたPostを保存
    if (
      formData.scope === PostingScope.SELECTED &&
      formData.selectedPostIds &&
      formData.selectedPostIds.length > 0
    ) {
      await prisma.schedulePost.createMany({
        data: formData.selectedPostIds.map((postId) => ({
          scheduleId: schedule.id,
          postId,
        })),
      });
    }

    revalidatePath('/schedules');
    return { success: true, schedule };
  } catch (error) {
    console.error('スケジュール作成エラー:', error);
    return { success: false, error: 'スケジュールの作成に失敗しました' };
  }
}

// 単発投稿の予約
export async function scheduleOneTimePost(formData: { postId: string; scheduledAt: Date }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('認証が必要です');
  }

  try {
    const scheduleEntry = await prisma.scheduleEntry.create({
      data: {
        postId: formData.postId,
        scheduledAt: formData.scheduledAt,
        status: ScheduleStatus.PENDING,
      },
    });

    revalidatePath('/schedules');
    return { success: true, scheduleEntry };
  } catch (error) {
    console.error('投稿予約エラー:', error);
    return { success: false, error: '投稿の予約に失敗しました' };
  }
}

// スケジュールの一覧取得
export async function getSchedules() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  try {
    const schedules = await prisma.schedule.findMany({
      where: { userId: user.id },
      include: {
        entries: {
          include: {
            post: {
              include: {
                images: true,
              },
            },
          },
          orderBy: { scheduledAt: 'desc' },
          take: 5, // 最新5件
        },
        selectedPosts: {
          include: {
            post: {
              include: {
                images: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return schedules;
  } catch (error) {
    console.error('スケジュール取得エラー:', error);
    return [];
  }
}

// Post一覧を取得
export async function getPosts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  try {
    const posts = await prisma.post.findMany({
      where: { userId: user.id },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    return posts;
  } catch (error) {
    console.error('Post取得エラー:', error);
    return [];
  }
}

// スケジュールエントリーのキャンセル
export async function cancelScheduleEntry(entryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('認証が必要です');
  }

  try {
    await prisma.scheduleEntry.update({
      where: {
        id: entryId,
        post: {
          userId: user.id,
        },
      },
      data: {
        status: ScheduleStatus.CANCELED,
      },
    });

    revalidatePath('/schedules');
    return { success: true };
  } catch (error) {
    console.error('予約キャンセルエラー:', error);
    return { success: false, error: '予約のキャンセルに失敗しました' };
  }
}

// 即時投稿
export async function postImmediately(postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('認証が必要です');
  }

  try {
    // 投稿データを取得
    const post = await prisma.post.findUnique({
      where: {
        id: postId,
        userId: user.id, // ユーザーの投稿のみ
      },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!post) {
      return { success: false, error: '投稿が見つかりません' };
    }

    if (post.images.length === 0) {
      return { success: false, error: '投稿に画像がありません' };
    }

    // 即時投稿用のスケジュールエントリーを作成
    const scheduleEntry = await prisma.scheduleEntry.create({
      data: {
        postId,
        scheduledAt: new Date(),
        status: ScheduleStatus.PENDING,
      },
    });

    try {
      // ユーザーの連携状況を取得
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          instagramAccessToken: true,
          instagramBusinessAccountId: true,
          xAccessToken: true,
          xAccessTokenSecret: true,
          xUserId: true,
          threadsAccessToken: true,
          threadsUserId: true,
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
      const hasThreads = !!(userData?.threadsAccessToken && userData?.threadsUserId);

      if (!hasInstagram && !hasTwitter && !hasThreads) {
        await prisma.scheduleEntry.update({
          where: { id: scheduleEntry.id },
          data: {
            status: ScheduleStatus.FAILED,
            errorMessage: 'Instagram、X、または Threads の連携が必要です',
          },
        });
        return { success: false, error: 'Instagram、X、または Threads の連携が必要です' };
      }

      const firstImage = post.images[0];

      // 各SNSへの投稿処理を並列実行するためのPromise配列
      const postingPromises: Promise<{ platform: string; success: boolean; error?: string }>[] = [];

      // Instagram投稿
      if (hasInstagram) {
        postingPromises.push(
          (async () => {
            try {
              const success = await postToInstagramStories(post, user.id);
              return {
                platform: 'Instagram',
                success,
                error: success ? undefined : 'Instagram投稿に失敗しました',
              };
            } catch (error) {
              return {
                platform: 'Instagram',
                success: false,
                error: `Instagram投稿エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
              };
            }
          })()
        );
      }

      // Twitter投稿
      if (hasTwitter && firstImage.xText) {
        postingPromises.push(
          (async () => {
            try {
              const success = await postToTwitter(firstImage.xText!, [], user.id);
              return {
                platform: 'X',
                success,
                error: success ? undefined : 'X投稿に失敗しました',
              };
            } catch (error) {
              return {
                platform: 'X',
                success: false,
                error: `X投稿エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
              };
            }
          })()
        );
      }

      // Threads投稿
      if (hasThreads && firstImage.threadsText) {
        postingPromises.push(
          (async () => {
            try {
              const threadsService = new ThreadsService(
                userData.threadsAccessToken!,
                userData.threadsUserId!
              );
              const threadsPostId = await threadsService.createTextPost(firstImage.threadsText!);
              return {
                platform: 'Threads',
                success: !!threadsPostId,
                error: threadsPostId ? undefined : 'Threads投稿に失敗しました',
              };
            } catch (error) {
              return {
                platform: 'Threads',
                success: false,
                error: `Threads投稿エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
              };
            }
          })()
        );
      }

      // 全てのSNS投稿を並列実行
      const results = await Promise.allSettled(postingPromises);

      // 結果を集計
      let instagramSuccess = false;
      let twitterSuccess = false;
      let threadsSuccess = false;
      const errors: string[] = [];

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { platform, success, error } = result.value;
          if (platform === 'Instagram') instagramSuccess = success;
          if (platform === 'X') twitterSuccess = success;
          if (platform === 'Threads') threadsSuccess = success;
          if (error) errors.push(error);
        } else {
          errors.push(`投稿処理中にエラーが発生しました: ${result.reason}`);
        }
      });

      // 結果を判定
      if (
        (hasInstagram && instagramSuccess) ||
        (hasTwitter && twitterSuccess) ||
        (hasThreads && threadsSuccess)
      ) {
        await prisma.scheduleEntry.update({
          where: { id: scheduleEntry.id },
          data: {
            status: ScheduleStatus.POSTED,
            postedAt: new Date(),
          },
        });

        const successMessages: string[] = [];
        if (instagramSuccess) successMessages.push('Instagram');
        if (twitterSuccess) successMessages.push('X');
        if (threadsSuccess) successMessages.push('Threads');

        revalidatePath('/posts');
        revalidatePath('/schedules');
        return {
          success: true,
          message: `${successMessages.join('と')}に投稿が完了しました${errors.length > 0 ? ` (一部エラー: ${errors.join(', ')})` : ''}`,
        };
      } else {
        await prisma.scheduleEntry.update({
          where: { id: scheduleEntry.id },
          data: {
            status: ScheduleStatus.FAILED,
            errorMessage: errors.join(', '),
          },
        });

        return { success: false, error: errors.join(', ') };
      }
    } catch (apiError) {
      await prisma.scheduleEntry.update({
        where: { id: scheduleEntry.id },
        data: {
          status: ScheduleStatus.FAILED,
          errorMessage: apiError instanceof Error ? apiError.message : '不明なエラー',
        },
      });

      return {
        success: false,
        error: `Instagram投稿エラー: ${apiError instanceof Error ? apiError.message : '不明なエラー'}`,
      };
    }
  } catch (error) {
    console.error('即時投稿エラー:', error);
    return { success: false, error: '投稿に失敗しました' };
  }
}

// スケジュールの有効/無効切り替え
export async function toggleScheduleActive(scheduleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('認証が必要です');
  }

  try {
    // 現在のスケジュールを取得
    const schedule = await prisma.schedule.findUnique({
      where: {
        id: scheduleId,
        userId: user.id,
      },
    });

    if (!schedule) {
      return { success: false, error: 'スケジュールが見つかりません' };
    }

    // 有効/無効を切り替え
    const updatedSchedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        isActive: !schedule.isActive,
        // 有効にする場合、次回実行時刻を再計算
        nextRun:
          !schedule.isActive && schedule.rrule
            ? (() => {
                try {
                  const rule = RRule.fromString(schedule.rrule);
                  return rule.after(new Date());
                } catch {
                  return null;
                }
              })()
            : schedule.isActive
              ? null
              : schedule.nextRun,
      },
    });

    revalidatePath('/schedules');
    return {
      success: true,
      message: updatedSchedule.isActive
        ? 'スケジュールを有効にしました'
        : 'スケジュールを無効にしました',
    };
  } catch (error) {
    console.error('スケジュール切り替えエラー:', error);
    return { success: false, error: 'スケジュールの切り替えに失敗しました' };
  }
}

// スケジュールの削除
export async function deleteSchedule(scheduleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('認証が必要です');
  }

  try {
    // ユーザーのスケジュールかチェック
    const schedule = await prisma.schedule.findUnique({
      where: {
        id: scheduleId,
        userId: user.id,
      },
    });

    if (!schedule) {
      return { success: false, error: 'スケジュールが見つかりません' };
    }

    // 関連するScheduleEntryは外部キー制約でCascadeDeleteされる
    await prisma.schedule.delete({
      where: { id: scheduleId },
    });

    revalidatePath('/schedules');
    return { success: true, message: 'スケジュールを削除しました' };
  } catch (error) {
    console.error('スケジュール削除エラー:', error);
    return { success: false, error: 'スケジュールの削除に失敗しました' };
  }
}

// スケジュールの更新
export async function updateSchedule(
  scheduleId: string,
  formData: {
    name?: string;
    strategy?: PostingStrategy;
    scope?: PostingScope;
    selectedPostIds?: string[];
    rrule?: string;
    timezone?: string;
    isActive?: boolean;
    autoReset?: boolean;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('認証が必要です');
  }

  try {
    // ユーザーのスケジュールかチェック
    const existingSchedule = await prisma.schedule.findUnique({
      where: {
        id: scheduleId,
        userId: user.id,
      },
    });

    if (!existingSchedule) {
      return { success: false, error: 'スケジュールが見つかりません' };
    }

    // 次回実行時刻を計算
    let nextRun: Date | null = existingSchedule.nextRun;
    if (formData.rrule !== undefined) {
      if (formData.rrule) {
        try {
          const rule = RRule.fromString(formData.rrule);
          const now = new Date();
          nextRun = rule.after(now);
        } catch {
          nextRun = null;
        }
      } else {
        nextRun = null;
      }
    }

    const updatedSchedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        ...(formData.name !== undefined && { name: formData.name }),
        ...(formData.strategy !== undefined && { strategy: formData.strategy }),
        ...(formData.scope !== undefined && { scope: formData.scope }),
        ...(formData.rrule !== undefined && { rrule: formData.rrule }),
        ...(formData.timezone !== undefined && { timezone: formData.timezone }),
        ...(formData.isActive !== undefined && { isActive: formData.isActive }),
        ...(formData.autoReset !== undefined && { autoReset: formData.autoReset }),
        nextRun,
      },
    });

    // スケジュールの投稿対象設定を更新
    if (formData.scope !== undefined) {
      if (formData.scope === PostingScope.SELECTED && formData.selectedPostIds) {
        // SELECTEDの場合：既存の選択を削除して新しい選択を追加
        await prisma.schedulePost.deleteMany({
          where: { scheduleId },
        });

        if (formData.selectedPostIds.length > 0) {
          await prisma.schedulePost.createMany({
            data: formData.selectedPostIds.map((postId) => ({
              scheduleId,
              postId,
            })),
          });
        }
      } else if (formData.scope === PostingScope.ALL) {
        // ALLの場合：既存のSchedulePostをすべて削除
        await prisma.schedulePost.deleteMany({
          where: { scheduleId },
        });
      }
    }

    revalidatePath('/schedules');
    return { success: true, schedule: updatedSchedule };
  } catch (error) {
    console.error('スケジュール更新エラー:', error);
    return { success: false, error: 'スケジュールの更新に失敗しました' };
  }
}

// スケジュール統計情報の取得
export async function getScheduleStatistics(scheduleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('認証が必要です');
  }

  try {
    // ユーザーのスケジュールかどうかを確認
    const schedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        userId: user.id,
      },
    });

    if (!schedule) {
      throw new Error('スケジュールが見つかりません');
    }

    const stats = await getScheduleStats(scheduleId);
    return { success: true, stats };
  } catch (error) {
    console.error('スケジュール統計取得エラー:', error);
    return { success: false, error: 'スケジュール統計の取得に失敗しました' };
  }
}

// スケジュールサイクルの手動リセット
export async function resetScheduleCycle(scheduleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('認証が必要です');
  }

  try {
    // ユーザーのスケジュールかどうかを確認
    const schedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        userId: user.id,
      },
    });

    if (!schedule) {
      throw new Error('スケジュールが見つかりません');
    }

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

    revalidatePath('/schedules');
    return { success: true };
  } catch (error) {
    console.error('スケジュールリセットエラー:', error);
    return { success: false, error: 'スケジュールのリセットに失敗しました' };
  }
}
