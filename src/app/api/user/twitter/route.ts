import { NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/supabase/server';
import { prisma } from '@/app/_lib/prisma';
import { disconnectTwitter } from '@/app/_services/TwitterService';

export async function GET() {
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

    // ユーザーのTwitter情報を取得
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        xAccessToken: true,
        xUserId: true,
        xUsername: true,
      },
    });

    if (!userData?.xAccessToken || !userData?.xUserId) {
      return NextResponse.json({
        isConnected: false,
      });
    }

    return NextResponse.json({
      id: userData.xUserId,
      username: userData.xUsername || '',
      isConnected: true,
    });
  } catch (error) {
    console.error('Get Twitter account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
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

    // Twitter連携を解除
    const success = await disconnectTwitter(user.id);

    if (!success) {
      throw new Error('Failed to disconnect Twitter');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Disconnect Twitter error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
