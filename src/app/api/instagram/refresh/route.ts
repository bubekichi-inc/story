import { NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/supabase/server';
import { exchangeForLongLivedToken } from '@/app/_services/InstagramService';
import { prisma } from '@/app/_lib/prisma';

export async function POST() {
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

    // ユーザーの既存のInstagram設定を取得
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        instagramAccessToken: true,
        instagramBusinessAccountId: true,
      },
    });

    if (!userData?.instagramAccessToken) {
      return NextResponse.json({ error: 'Instagram連携が見つかりません' }, { status: 404 });
    }

    // 短期トークンをリフレッシュして長期トークンを取得
    const res = await exchangeForLongLivedToken(userData.instagramAccessToken);

    if (!res) {
      return NextResponse.json(
        { error: 'Instagramトークンの更新に失敗しました。' },
        { status: 400 }
      );
    }

    const { accessToken, expiresIn } = res;

    const expiresAt = new Date(Date.now() + (expiresIn || 5184000) * 1000);

    // データベースを更新
    await prisma.user.update({
      where: { id: user.id },
      data: {
        instagramAccessToken: accessToken,
        instagramTokenExpiresAt: expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Instagramトークンが正常に更新されました',
      expiresAt,
    });
  } catch (error) {
    console.error('Instagram token refresh error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
