import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/supabase/server';
import {
  getAccessToken,
  getRequestTokenSecret,
  saveTwitterConfig,
} from '@/app/_services/TwitterService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const oauthToken = searchParams.get('oauth_token');
    const oauthVerifier = searchParams.get('oauth_verifier');
    const denied = searchParams.get('denied');

    if (denied) {
      return NextResponse.redirect(`${origin}/accounts?error=access_denied`);
    }

    if (!oauthToken || !oauthVerifier) {
      return NextResponse.redirect(`${origin}/accounts?error=invalid_request`);
    }

    // ユーザー認証チェック
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.redirect(`${origin}/accounts?error=unauthorized`);
    }

    // 保存されたリクエストトークンシークレットを取得
    const tokenSecret = getRequestTokenSecret(oauthToken);
    if (!tokenSecret) {
      return NextResponse.redirect(`${origin}/accounts?error=token_not_found`);
    }

    // アクセストークンを取得
    const accessTokenData = await getAccessToken(oauthToken, tokenSecret, oauthVerifier);

    if (!accessTokenData) {
      return NextResponse.redirect(`${origin}/accounts?error=token_exchange_failed`);
    }

    // Twitterアカウント情報を保存
    const success = await saveTwitterConfig(
      user.id,
      accessTokenData.oauth_token,
      accessTokenData.oauth_token_secret,
      accessTokenData.user_id,
      accessTokenData.screen_name
    );

    if (!success) {
      throw new Error('Failed to save Twitter config');
    }

    return NextResponse.redirect(`${origin}/accounts?twitter_success=true`);
  } catch (error) {
    console.error('Twitter callback error:', error);
    const { origin } = new URL(request.url);
    return NextResponse.redirect(`${origin}/accounts?error=server_error`);
  }
}
