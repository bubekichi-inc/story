import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/_lib/prisma';
import { createClient } from '@/app/_lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // エラーの場合
    if (error) {
      console.error('Threads auth error:', error);
      return NextResponse.redirect(new URL(`/accounts?error=${error}`, request.url));
    }

    // codeがない場合
    if (!code || !state) {
      console.error('Missing code or state parameter');
      return NextResponse.redirect(new URL('/accounts?error=invalid_request', request.url));
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== state) {
      console.error('Invalid user or state mismatch');
      return NextResponse.redirect(new URL('/accounts?error=unauthorized', request.url));
    }

    const threadsAppId = process.env.FACEBOOK_THREADS_APP_ID;
    const threadsAppSecret = process.env.FACEBOOK_THREADS_APP_SECRET;

    if (!threadsAppId || !threadsAppSecret) {
      console.error('Threads app credentials not configured');
      return NextResponse.redirect(new URL('/accounts?error=server_error', request.url));
    }

    // 短期アクセストークンを取得
    const tokenResponse = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: threadsAppId,
        client_secret: threadsAppSecret,
        grant_type: 'authorization_code',
        redirect_uri: new URL('/api/threads/callback', request.url).toString(),
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(new URL('/accounts?error=server_error', request.url));
    }

    const tokenData = await tokenResponse.json();
    const shortLivedToken = tokenData.access_token;
    const threadsUserId = tokenData.user_id;

    if (!shortLivedToken || !threadsUserId) {
      console.error('Invalid token response');
      return NextResponse.redirect(new URL('/accounts?error=server_error', request.url));
    }

    // 長期アクセストークンに交換
    const longTokenResponse = await fetch(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${threadsAppSecret}&access_token=${shortLivedToken}`
    );

    if (!longTokenResponse.ok) {
      console.error('Long-lived token exchange failed');
      return NextResponse.redirect(new URL('/accounts?error=server_error', request.url));
    }

    const longTokenData = await longTokenResponse.json();
    const longLivedToken = longTokenData.access_token;
    const expiresIn = longTokenData.expires_in;

    // トークンの有効期限を計算
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // データベースに保存
    await prisma.user.update({
      where: { id: user.id },
      data: {
        threadsAccessToken: longLivedToken,
        threadsUserId: threadsUserId.toString(),
        threadsTokenExpiresAt: expiresAt,
      },
    });

    return NextResponse.redirect(new URL('/accounts?threads_success=1', request.url));
  } catch (error) {
    console.error('Threads callback error:', error);
    return NextResponse.redirect(new URL('/accounts?error=server_error', request.url));
  }
}
