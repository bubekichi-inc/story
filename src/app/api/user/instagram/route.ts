import { NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/supabase/server';
import { prisma } from '@/app/_lib/prisma';
import { disconnectInstagram } from '@/app/_services/InstagramService';

export async function GET() {
  try {
    // ユーザー認証チェック
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ユーザーのInstagram情報を取得
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        instagramAccessToken: true,
        instagramBusinessAccountId: true,
        instagramTokenExpiresAt: true,
      },
    });

    if (!userData?.instagramAccessToken || !userData?.instagramBusinessAccountId) {
      return NextResponse.json({
        isConnected: false,
      });
    }

    // Instagram Graph APIでユーザー名を取得
    let username = '';
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${userData.instagramBusinessAccountId}?fields=username&access_token=${userData.instagramAccessToken}`
      );
      
      if (response.ok) {
        const data = await response.json();
        username = data.username || '';
      }
    } catch (error) {
      console.error('Failed to fetch Instagram username:', error);
    }

    return NextResponse.json({
      id: userData.instagramBusinessAccountId,
      username,
      isConnected: true,
      expiresAt: userData.instagramTokenExpiresAt,
    });
  } catch (error) {
    console.error('Get Instagram account error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // ユーザー認証チェック
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Instagram連携を解除
    const success = await disconnectInstagram(user.id);
    
    if (!success) {
      throw new Error('Failed to disconnect Instagram');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Disconnect Instagram error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}