import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/app/_lib/prisma';
import { createClient } from '@/app/_lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        threadsUserId: true,
        threadsAccessToken: true,
        threadsTokenExpiresAt: true,
      },
    });

    if (!userData?.threadsAccessToken || !userData?.threadsUserId) {
      return NextResponse.json({ isConnected: false });
    }

    // Threads APIでユーザー情報を取得して接続を確認
    try {
      const response = await fetch(
        `https://graph.threads.net/v1.0/${userData.threadsUserId}?fields=id,username&access_token=${userData.threadsAccessToken}`
      );

      if (response.ok) {
        const threadsUserData = await response.json();
        return NextResponse.json({
          isConnected: true,
          id: userData.threadsUserId,
          username: threadsUserData.username,
          expiresAt: userData.threadsTokenExpiresAt,
        });
      } else {
        // APIエラーの場合は接続が無効とみなす
        return NextResponse.json({ isConnected: false });
      }
    } catch (error) {
      console.error('Threads API error:', error);
      return NextResponse.json({ isConnected: false });
    }
  } catch (error) {
    console.error('Get Threads user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Threadsトークン情報をクリア
    await prisma.user.update({
      where: { id: user.id },
      data: {
        threadsAccessToken: null,
        threadsUserId: null,
        threadsTokenExpiresAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Threads connection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
