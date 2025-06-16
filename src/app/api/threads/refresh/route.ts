import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/app/_lib/prisma';
import { createClient } from '@/app/_lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ユーザーのThreadsトークン情報を取得
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        threadsAccessToken: true,
        threadsTokenExpiresAt: true,
      },
    });

    if (!userData?.threadsAccessToken) {
      return NextResponse.json({ error: 'Threads not connected' }, { status: 400 });
    }

    const threadsAppSecret = process.env.FACEBOOK_THREADS_APP_SECRET;
    if (!threadsAppSecret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // トークンの有効期限をチェック
    if (userData.threadsTokenExpiresAt && userData.threadsTokenExpiresAt <= new Date()) {
      return NextResponse.json(
        {
          error: 'Token expired',
          requireReauth: true,
        },
        { status: 400 }
      );
    }

    // 長期トークンを更新
    const refreshResponse = await fetch(
      `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${userData.threadsAccessToken}`
    );

    if (!refreshResponse.ok) {
      const errorData = await refreshResponse.text();
      console.error('Token refresh failed:', errorData);

      // トークンが無効な場合は再認証が必要
      if (refreshResponse.status === 401 || refreshResponse.status === 403) {
        return NextResponse.json(
          {
            error: 'Token refresh failed',
            requireReauth: true,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({ error: 'Token refresh failed' }, { status: 500 });
    }

    const refreshData = await refreshResponse.json();
    const newToken = refreshData.access_token;
    const expiresIn = refreshData.expires_in;

    // 新しい有効期限を計算
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // データベースを更新
    await prisma.user.update({
      where: { id: user.id },
      data: {
        threadsAccessToken: newToken,
        threadsTokenExpiresAt: newExpiresAt,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Threads refresh error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
