import { prisma } from '@/app/_lib/prisma';
import crypto from 'crypto';

interface TwitterConfig {
  accessToken: string;
  accessTokenSecret: string;
  userId: string;
}

interface TweetResponse {
  data: {
    id: string;
    text: string;
  };
}

interface TwitterUserResponse {
  data: {
    id: string;
    username: string;
    name: string;
  };
}

interface RequestTokenResponse {
  oauth_token: string;
  oauth_token_secret: string;
  oauth_callback_confirmed: string;
}

interface AccessTokenResponse {
  oauth_token: string;
  oauth_token_secret: string;
  user_id: string;
  screen_name: string;
}

/**
 * OAuth署名を生成する
 */
function generateSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret?: string
): string {
  // パラメータをソートしてエンコード
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  // 署名ベース文字列を作成
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join('&');

  // 署名キーを作成
  const signingKey =
    encodeURIComponent(consumerSecret) + '&' + (tokenSecret ? encodeURIComponent(tokenSecret) : '');

  // HMAC-SHA1で署名を生成
  return crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64');
}

/**
 * OAuthヘッダーを生成する
 */
function generateOAuthHeader(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  token?: string,
  tokenSecret?: string,
  verifier?: string
): string {
  const nonce = crypto.randomBytes(32).toString('base64').replace(/\W/g, '');
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const params: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_version: '1.0',
  };

  if (token) params.oauth_token = token;
  if (verifier) params.oauth_verifier = verifier;

  const signature = generateSignature(method, url, params, consumerSecret, tokenSecret);
  params.oauth_signature = signature;

  const headerParams = Object.keys(params)
    .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(params[key])}"`)
    .join(', ');

  return `OAuth ${headerParams}`;
}

/**
 * リクエストトークンを取得する（OAuth Step 1）
 */
export async function getRequestToken(callbackUrl: string): Promise<RequestTokenResponse | null> {
  try {
    const consumerKey = process.env.TWITTER_API_KEY;
    const consumerSecret = process.env.TWITTER_API_SECRET_KEY;

    if (!consumerKey || !consumerSecret) {
      console.error('Twitter API credentials are missing');
      return null;
    }

    const url = 'https://api.twitter.com/oauth/request_token';
    const method = 'POST';

    const params: Record<string, string> = {
      oauth_callback: callbackUrl,
      oauth_consumer_key: consumerKey,
      oauth_nonce: crypto.randomBytes(32).toString('base64').replace(/\W/g, ''),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_version: '1.0',
    };

    const signature = generateSignature(method, url, params, consumerSecret);
    params.oauth_signature = signature;

    const headerParams = Object.keys(params)
      .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(params[key])}"`)
      .join(', ');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `OAuth ${headerParams}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      console.error('Failed to get request token:', response.status, response.statusText);
      return null;
    }

    const responseText = await response.text();
    const responseParams = new URLSearchParams(responseText);

    return {
      oauth_token: responseParams.get('oauth_token') || '',
      oauth_token_secret: responseParams.get('oauth_token_secret') || '',
      oauth_callback_confirmed: responseParams.get('oauth_callback_confirmed') || '',
    };
  } catch (error) {
    console.error('Error getting request token:', error);
    return null;
  }
}

/**
 * アクセストークンを取得する（OAuth Step 3）
 */
export async function getAccessToken(
  oauthToken: string,
  oauthTokenSecret: string,
  oauthVerifier: string
): Promise<AccessTokenResponse | null> {
  try {
    const consumerKey = process.env.TWITTER_API_KEY;
    const consumerSecret = process.env.TWITTER_API_SECRET_KEY;

    if (!consumerKey || !consumerSecret) {
      console.error('Twitter API credentials are missing');
      return null;
    }

    const url = 'https://api.twitter.com/oauth/access_token';
    const method = 'POST';

    const authHeader = generateOAuthHeader(
      method,
      url,
      consumerKey,
      consumerSecret,
      oauthToken,
      oauthTokenSecret,
      oauthVerifier
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      console.error('Failed to get access token:', response.status, response.statusText);
      return null;
    }

    const responseText = await response.text();
    const responseParams = new URLSearchParams(responseText);

    return {
      oauth_token: responseParams.get('oauth_token') || '',
      oauth_token_secret: responseParams.get('oauth_token_secret') || '',
      user_id: responseParams.get('user_id') || '',
      screen_name: responseParams.get('screen_name') || '',
    };
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

/**
 * X (Twitter) API v2を使用してツイートを投稿する
 * @param text ツイート内容
 * @param mediaIds メディアID（画像がある場合）
 * @param userId ユーザーID
 * @returns 投稿成功の可否
 */
export async function postToTwitter(
  text: string,
  mediaIds: string[] = [],
  userId: string
): Promise<boolean> {
  try {
    const config = await getTwitterConfig(userId);
    if (!config) {
      console.error('Twitter設定が見つかりません');
      return false;
    }

    const tweetData: {
      text: string;
      media?: {
        media_ids: string[];
      };
    } = {
      text: text,
    };

    if (mediaIds.length > 0) {
      tweetData.media = {
        media_ids: mediaIds,
      };
    }

    const consumerKey = process.env.TWITTER_API_KEY;
    const consumerSecret = process.env.TWITTER_API_SECRET_KEY;

    if (!consumerKey || !consumerSecret) {
      console.error('Twitter API credentials are missing');
      return false;
    }

    const url = 'https://api.twitter.com/2/tweets';
    const method = 'POST';

    // OAuth 1.0aヘッダーを生成
    const authHeader = generateOAuthHeader(
      method,
      url,
      consumerKey,
      consumerSecret,
      config.accessToken,
      config.accessTokenSecret
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tweetData),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Twitter投稿エラー:', error);
      return false;
    }

    const result: TweetResponse = await response.json();
    console.log(`Twitter投稿成功: ${result.data.id}`);
    return true;
  } catch (error) {
    console.error('Twitter投稿エラー:', error);
    return false;
  }
}

/**
 * 画像をTwitterにアップロードする
 * @param imageUrl 画像URL
 * @param config Twitter設定
 * @returns メディアID
 */
export async function uploadImageToTwitter(
  imageUrl: string,
  config: TwitterConfig
): Promise<string | null> {
  try {
    const consumerKey = process.env.TWITTER_API_KEY;
    const consumerSecret = process.env.TWITTER_API_SECRET_KEY;

    if (!consumerKey || !consumerSecret) {
      console.error('Twitter API credentials are missing');
      return null;
    }

    // 画像データを取得
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    const url = 'https://upload.twitter.com/1.1/media/upload.json';
    const method = 'POST';

    // OAuth 1.0aヘッダーを生成（POST bodyの内容も署名に含める必要がある）
    const body = `media_data=${encodeURIComponent(base64Image)}`;
    const authHeader = generateOAuthHeader(
      method,
      url,
      consumerKey,
      consumerSecret,
      config.accessToken,
      config.accessTokenSecret
    );

    const uploadResponse = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`Media upload failed: ${error}`);
    }

    const uploadResult = await uploadResponse.json();
    return uploadResult.media_id_string;
  } catch (error) {
    console.error('Twitter画像アップロードエラー:', error);
    return null;
  }
}

/**
 * ユーザーのTwitter設定を取得
 */
async function getTwitterConfig(userId: string): Promise<TwitterConfig | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        xAccessToken: true,
        xAccessTokenSecret: true,
        xUserId: true,
      },
    });

    if (!user?.xAccessToken || !user?.xAccessTokenSecret || !user?.xUserId) {
      console.error('ユーザーのTwitter設定が未完了です');
      return null;
    }

    return {
      accessToken: user.xAccessToken,
      accessTokenSecret: user.xAccessTokenSecret,
      userId: user.xUserId,
    };
  } catch (error) {
    console.error('Twitter設定取得エラー:', error);
    return null;
  }
}

// この関数は現在使用されていないため削除
// 将来的に必要になった場合は再実装する

/**
 * Twitter認証URLを生成
 */
export function generateTwitterAuthUrl(): string {
  const authUrl = 'https://api.twitter.com/oauth/authorize';
  const params = new URLSearchParams({
    oauth_token: 'REQUEST_TOKEN', // 実際にはrequest tokenが必要
  });

  return `${authUrl}?${params.toString()}`;
}

/**
 * Twitterユーザー情報を取得
 */
export async function getTwitterUserInfo(
  config: TwitterConfig
): Promise<TwitterUserResponse | null> {
  try {
    const consumerKey = process.env.TWITTER_API_KEY;
    const consumerSecret = process.env.TWITTER_API_SECRET_KEY;

    if (!consumerKey || !consumerSecret) {
      console.error('Twitter API credentials are missing');
      return null;
    }

    const url = 'https://api.twitter.com/2/users/me';
    const method = 'GET';

    const authHeader = generateOAuthHeader(
      method,
      url,
      consumerKey,
      consumerSecret,
      config.accessToken,
      config.accessTokenSecret
    );

    const response = await fetch(url, {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return await response.json();
  } catch (error) {
    console.error('Twitter user info error:', error);
    return null;
  }
}

/**
 * ユーザーのTwitter設定を保存
 */
export async function saveTwitterConfig(
  userId: string,
  accessToken: string,
  accessTokenSecret: string,
  twitterUserId: string,
  username: string
): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        xAccessToken: accessToken,
        xAccessTokenSecret: accessTokenSecret,
        xUserId: twitterUserId,
        xUsername: username,
      },
    });
    return true;
  } catch (error) {
    console.error('Twitter設定保存エラー:', error);
    return false;
  }
}

/**
 * ユーザーのTwitter連携を解除
 */
export async function disconnectTwitter(userId: string): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        xAccessToken: null,
        xAccessTokenSecret: null,
        xUserId: null,
        xUsername: null,
      },
    });
    return true;
  } catch (error) {
    console.error('Twitter連携解除エラー:', error);
    return false;
  }
}

// リクエストトークンの一時保存用（実際の本番環境ではRedisを使用推奨）
const requestTokenStore = new Map<string, { tokenSecret: string; timestamp: number }>();

/**
 * リクエストトークンシークレットを一時保存する
 */
export function storeRequestTokenSecret(token: string, tokenSecret: string): void {
  requestTokenStore.set(token, {
    tokenSecret,
    timestamp: Date.now(),
  });

  // 10分後に自動削除
  setTimeout(
    () => {
      requestTokenStore.delete(token);
    },
    10 * 60 * 1000
  );
}

/**
 * リクエストトークンシークレットを取得する
 */
export function getRequestTokenSecret(token: string): string | null {
  const stored = requestTokenStore.get(token);
  if (!stored) return null;

  // 10分以上経過している場合は削除
  if (Date.now() - stored.timestamp > 10 * 60 * 1000) {
    requestTokenStore.delete(token);
    return null;
  }

  return stored.tokenSecret;
}
