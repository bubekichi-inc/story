import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/supabase/server';
import { getRequestToken, storeRequestTokenSecret } from '@/app/_services/TwitterService';

export async function GET(request: NextRequest) {
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

    const { origin } = new URL(request.url);
    const callbackUrl = `${origin}/api/twitter/callback`;

    // リクエストトークンを取得
    const requestTokenData = await getRequestToken(callbackUrl);

    if (!requestTokenData) {
      return NextResponse.json({ error: 'Failed to get Twitter request token' }, { status: 500 });
    }

    // リクエストトークンシークレットを一時保存
    storeRequestTokenSecret(requestTokenData.oauth_token, requestTokenData.oauth_token_secret);

    // Twitter認証画面にリダイレクト
    const authUrl = `https://api.twitter.com/oauth/authenticate?oauth_token=${requestTokenData.oauth_token}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Twitter auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
