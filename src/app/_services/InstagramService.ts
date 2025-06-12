import { prisma } from '@/app/_lib/prisma';

type PostImage = {
  id: string;
  postId: string;
  imageUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  order: number;
  createdAt: Date;
  threadsText: string | null;
  xText: string | null;
};

type PostWithImages = {
  id: string;
  storyText: string | null;
  images: PostImage[];
};

// Instagram Graph API用の設定
interface InstagramConfig {
  accessToken: string;
  instagramBusinessAccountId: string;
}

// Instagram API レスポンス型
interface InstagramMediaResponse {
  id: string;
}

interface InstagramPublishResponse {
  id: string;
}

/**
 * Instagram Graph APIを使用してストーリーズに投稿する
 * @param post 投稿データ
 * @param userId ユーザーID
 * @returns 投稿成功の可否
 */
export async function postToInstagramStories(
  post: PostWithImages,
  userId: string
): Promise<boolean> {
  try {
    // ユーザーのInstagram設定を取得
    const config = await getInstagramConfig(userId);
    if (!config) {
      console.error('Instagram設定が見つかりません');
      return false;
    }

    // 最初の画像を使用（ストーリーズは1枚ずつ）
    const image = post.images[0];
    if (!image) {
      console.error('投稿に画像がありません');
      return false;
    }

    // メディアコンテナを作成
    const mediaResponse = await createInstagramMediaContainer(config, image.imageUrl);
    if (!mediaResponse.id) {
      console.error('メディアコンテナの作成に失敗');
      return false;
    }

    // ストーリーズに投稿
    const publishResponse = await publishInstagramStory(config, mediaResponse.id);
    if (!publishResponse.id) {
      console.error('ストーリーズの投稿に失敗');
      return false;
    }

    console.log(`Instagram ストーリーズに投稿成功: ${publishResponse.id}`);
    return true;
  } catch (error) {
    console.error('Instagram投稿エラー:', error);
    return false;
  }
}

/**
 * ユーザーのInstagram設定を取得
 */
async function getInstagramConfig(userId: string): Promise<InstagramConfig | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        instagramAccessToken: true,
        instagramBusinessAccountId: true,
        instagramTokenExpiresAt: true,
      },
    });

    if (!user?.instagramAccessToken || !user?.instagramBusinessAccountId) {
      console.error('ユーザーのInstagram設定が未完了です');
      return null;
    }

    // トークンの有効期限をチェック
    if (user.instagramTokenExpiresAt && user.instagramTokenExpiresAt < new Date()) {
      console.error('Instagramアクセストークンが期限切れです');
      return null;
    }

    return {
      accessToken: user.instagramAccessToken,
      instagramBusinessAccountId: user.instagramBusinessAccountId,
    };
  } catch (error) {
    console.error('Instagram設定取得エラー:', error);
    return null;
  }
}

/**
 * Instagram メディアコンテナを作成
 */
async function createInstagramMediaContainer(
  config: InstagramConfig,
  imageUrl: string
): Promise<InstagramMediaResponse> {
  const url = `https://graph.facebook.com/v18.0/${config.instagramBusinessAccountId}/media`;

  const params = new URLSearchParams({
    image_url: imageUrl,
    media_type: 'STORIES',
    access_token: config.accessToken,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`メディアコンテナ作成エラー: ${error}`);
  }

  return response.json();
}

/**
 * Instagram ストーリーズに投稿
 */
async function publishInstagramStory(
  config: InstagramConfig,
  creationId: string
): Promise<InstagramPublishResponse> {
  const url = `https://graph.facebook.com/v18.0/${config.instagramBusinessAccountId}/media_publish`;

  const params = new URLSearchParams({
    creation_id: creationId,
    access_token: config.accessToken,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ストーリーズ投稿エラー: ${error}`);
  }

  return response.json();
}

/**
 * アクセストークンの有効性をチェック
 */
export async function validateInstagramToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}`);
    return response.ok;
  } catch (error) {
    console.error('トークン検証エラー:', error);
    return false;
  }
}

/**
 * アクセストークンを更新
 */
export async function refreshInstagramToken(accessToken: string): Promise<string | null> {
  try {
    const url = 'https://graph.facebook.com/oauth/access_token';
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: process.env.FACEBOOK_APP_ID!,
      client_secret: process.env.FACEBOOK_APP_SECRET!,
      fb_exchange_token: accessToken,
    });

    const response = await fetch(`${url}?${params}`);
    if (!response.ok) {
      throw new Error('トークン更新に失敗');
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('トークン更新エラー:', error);
    return null;
  }
}

/**
 * レート制限を考慮した待機処理
 */
export async function waitForRateLimit(): Promise<void> {
  // Instagram APIのレート制限: 200リクエスト/時間
  // 環境変数から設定可能、デフォルトは18秒（1時間 / 200 = 18秒）
  const delayMs = parseInt(process.env.INSTAGRAM_RATE_LIMIT_DELAY_MS || '18000', 10);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Instagram認証コードを短期アクセストークンに交換
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<string | null> {
  try {
    const url = 'https://graph.facebook.com/v22.0/oauth/access_token';
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: process.env.FACEBOOK_APP_ID!,
      client_secret: process.env.FACEBOOK_APP_SECRET!,
      fb_exchange_token: code,
      redirect_uri: redirectUri,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      console.error('Failed to exchange code for token:', response.statusText);
      console.error('Response body:', await response.text());
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Token exchange error:', error);
    return null;
  }
}

/**
 * 短期アクセストークンを長期アクセストークン（60日間有効）に交換
 */
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
} | null> {
  try {
    const url = 'https://graph.facebook.com/v18.0/oauth/access_token';
    const params = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: process.env.FACEBOOK_APP_SECRET!,
      access_token: shortLivedToken,
    });

    const response = await fetch(`${url}?${params}`);
    if (!response.ok) {
      throw new Error('Failed to exchange for long-lived token');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in, // seconds
    };
  } catch (error) {
    console.error('Long-lived token exchange error:', error);
    return null;
  }
}

/**
 * Instagramビジネスアカウント情報を取得
 */
export async function getInstagramBusinessAccount(accessToken: string): Promise<{
  id: string;
  username: string;
} | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,username&access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error('Failed to get Instagram business account info');
    }

    const data = await response.json();
    return {
      id: data.id,
      username: data.username,
    };
  } catch (error) {
    console.error('Instagram business account info error:', error);
    return null;
  }
}

/**
 * ユーザーのInstagram設定を保存
 */
export async function saveInstagramConfig(
  userId: string,
  accessToken: string,
  businessAccountId: string,
  expiresAt: Date
): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        instagramAccessToken: accessToken,
        instagramBusinessAccountId: businessAccountId,
        instagramTokenExpiresAt: expiresAt,
      },
    });
    return true;
  } catch (error) {
    console.error('Instagram設定保存エラー:', error);
    return false;
  }
}

/**
 * ユーザーのInstagram連携を解除
 */
export async function disconnectInstagram(userId: string): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        instagramAccessToken: null,
        instagramBusinessAccountId: null,
        instagramTokenExpiresAt: null,
      },
    });
    return true;
  } catch (error) {
    console.error('Instagram連携解除エラー:', error);
    return false;
  }
}
