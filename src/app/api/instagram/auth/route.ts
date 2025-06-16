import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/supabase/server';

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
    const redirectUri = `${origin}/accounts`;

    // Facebook OAuth URL（参考コードと同じ形式）
    const scopes = [
      'pages_show_list', // 自分のFacebookページの情報を取得するために必要
      'instagram_basic', // 自分のInstagramアカウントの情報を取得するために必要
      'instagram_content_publish', // ストーリーへの投稿のために必要
      'pages_read_engagement', // GET {page-id}/?fields=instagram_business_account に必要
      'pages_manage_metadata', // https://graph.facebook.com/{page-id}/subscribed_apps でconversationsをsubscribeするために必要
      'business_management', // MetaBusinessマネージャからPageと連携したInstagramアカウントの場合必要
    ];

    const authUrl = `https://www.facebook.com/dialog/oauth?client_id=${
      process.env.FACEBOOK_APP_ID
    }&display=page&extras={"setup":{"channel": "IG_API_ONBOARDING"}}&redirect_uri=${
      redirectUri
    }&response_type=token&scope=${scopes.join(',')}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Instagram auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
