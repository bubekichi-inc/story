'use server';

import { prisma } from '@/app/_lib/prisma';
import { createClient } from '@/app/_lib/supabase/server';
import { PostingStrategy, ScheduleStatus } from '@prisma/client';
import { RRule } from 'rrule';
import { revalidatePath } from 'next/cache';
import { postToInstagramStories } from '@/app/_services/InstagramService';

// スケジュール作成
export async function createSchedule(formData: {
  name: string;
  strategy: PostingStrategy;
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
        rrule: formData.rrule,
        timezone: formData.timezone || 'Asia/Tokyo',
        nextRun,
      },
    });

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
      },
      orderBy: { createdAt: 'desc' },
    });

    return schedules;
  } catch (error) {
    console.error('スケジュール取得エラー:', error);
    return [];
  }
}

// カレンダー用のスケジュールエントリー取得
export async function getScheduleEntriesForCalendar(startDate: Date, endDate: Date) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  try {
    const entries = await prisma.scheduleEntry.findMany({
      where: {
        scheduledAt: {
          gte: startDate,
          lte: endDate,
        },
        post: {
          userId: user.id,
        },
      },
      include: {
        post: {
          include: {
            images: {
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
        schedule: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return entries;
  } catch (error) {
    console.error('カレンダー用エントリー取得エラー:', error);
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
