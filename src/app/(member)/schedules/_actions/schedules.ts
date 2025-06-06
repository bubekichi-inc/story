'use server';

import { prisma } from '@/app/_lib/prisma';
import { createClient } from '@/app/_lib/supabase/server';
import { PostingStrategy, PostingScope, ScheduleStatus } from '@prisma/client';
import { RRule } from 'rrule';
import { revalidatePath } from 'next/cache';
import { postToInstagramStories } from '@/app/_services/InstagramService';

// スケジュール作成
export async function createSchedule(formData: {
  name: string;
  strategy: PostingStrategy;
  scope: PostingScope;
  selectedPostIds?: string[];
  rrule?: string;
  timezone?: string;
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
      // 実際のInstagram API呼び出し
      const success = await postToInstagramStories(post, user.id);

      if (success) {
        await prisma.scheduleEntry.update({
          where: { id: scheduleEntry.id },
          data: {
            status: ScheduleStatus.POSTED,
            postedAt: new Date(),
          },
        });

        revalidatePath('/posts');
        revalidatePath('/schedules');
        return { success: true, message: 'Instagramストーリーズに投稿が完了しました' };
      } else {
        await prisma.scheduleEntry.update({
          where: { id: scheduleEntry.id },
          data: {
            status: ScheduleStatus.FAILED,
            errorMessage: 'Instagram投稿に失敗しました',
          },
        });

        return { success: false, error: 'Instagram投稿に失敗しました' };
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
