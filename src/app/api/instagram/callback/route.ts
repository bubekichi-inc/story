import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getInstagramBusinessAccount,
  saveInstagramConfig,
} from '@/app/_services/InstagramService';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // ユーザーID
  const error = searchParams.get('error');

  if (error) {
    console.error('Instagram OAuth error:', error);
    return NextResponse.redirect(`${origin}/accounts?error=access_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/accounts?error=invalid_request`);
  }

  try {
    const redirectUri = `${origin}/api/instagram/callback`;

    // 1. 認証コードを短期アクセストークンに交換
    const shortLivedToken = await exchangeCodeForToken(code, redirectUri);
    if (!shortLivedToken) {
      throw new Error('Failed to exchange code for token');
    }

    // 2. 短期トークンを長期トークン（60日間有効）に交換
    const longLivedTokenData = await exchangeForLongLivedToken(shortLivedToken);
    if (!longLivedTokenData) {
      throw new Error('Failed to exchange for long-lived token');
    }

    // 3. Instagramビジネスアカウント情報を取得
    const businessAccount = await getInstagramBusinessAccount(longLivedTokenData.accessToken);
    if (!businessAccount) {
      throw new Error('Failed to get Instagram business account info');
    }

    // 4. トークン有効期限を計算（60日後）
    const expiresAt = new Date(Date.now() + longLivedTokenData.expiresIn * 1000);

    // 5. データベースに保存
    const success = await saveInstagramConfig(
      state, // ユーザーID
      longLivedTokenData.accessToken,
      businessAccount.id,
      expiresAt
    );

    if (!success) {
      throw new Error('Failed to save Instagram config');
    }

    return NextResponse.redirect(`${origin}/accounts?success=true`);
  } catch (error) {
    console.error('Instagram callback error:', error);
    return NextResponse.redirect(`${origin}/accounts?error=server_error`);
  }
}