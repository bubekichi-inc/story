import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/supabase/server';
import { prisma } from '@/app/_lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // ユーザー認証チェック
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accessToken, accountId, instagramAccountId, pageAccessToken } = body;

    if (!accessToken || !accountId || !instagramAccountId || !pageAccessToken) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 長期アクセストークンに交換
    const longTokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${accessToken}`
    );

    if (!longTokenResponse.ok) {
      throw new Error('Failed to exchange for long-lived token');
    }

    const longTokenData = await longTokenResponse.json();

    // 有効期限を計算（約60日後）
    const expiresAt = new Date(Date.now() + (longTokenData.expires_in || 5184000) * 1000);

    // データベースに保存
    await prisma.user.update({
      where: { id: user.id },
      data: {
        instagramAccessToken: longTokenData.access_token,
        instagramBusinessAccountId: instagramAccountId,
        instagramTokenExpiresAt: expiresAt,
        facebookPageId: accountId,
        facebookPageAccessToken: pageAccessToken,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Instagram connect error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
