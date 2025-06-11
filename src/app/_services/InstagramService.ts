interface InstagramUser {
  id: string;
  name?: string;
  username?: string;
}

interface InstagramBusinessAccount {
  id: string;
  name: string;
  username: string;
  instagram_business_account?: {
    id: string;
  };
}

interface InstagramTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface InstagramLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface InstagramStoryMediaResponse {
  id: string;
}

export class InstagramService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly baseUrl = 'https://graph.facebook.com/v18.0';

  constructor() {
    this.clientId = process.env.INSTAGRAM_CLIENT_ID || '';
    this.clientSecret = process.env.INSTAGRAM_CLIENT_SECRET || '';
    this.redirectUri = process.env.INSTAGRAM_REDIRECT_URI || '';
  }

  /**
   * Generate the Instagram OAuth authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
      response_type: 'code',
      ...(state && { state }),
    });

    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for short-lived access token
   */
  async getShortLivedToken(code: string): Promise<InstagramTokenResponse> {
    const response = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
        code,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get short-lived token: ${error}`);
    }

    return response.json();
  }

  /**
   * Exchange short-lived token for long-lived token (60 days)
   */
  async getLongLivedToken(shortLivedToken: string): Promise<InstagramLongLivedTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: this.clientSecret,
      access_token: shortLivedToken,
    });

    const response = await fetch(`${this.baseUrl}/oauth/access_token?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get long-lived token: ${error}`);
    }

    return response.json();
  }

  /**
   * Refresh long-lived token to extend its expiration
   */
  async refreshLongLivedToken(accessToken: string): Promise<InstagramLongLivedTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'ig_refresh_token',
      access_token: accessToken,
    });

    const response = await fetch(`${this.baseUrl}/refresh_access_token?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }

    return response.json();
  }

  /**
   * Get user information
   */
  async getUserInfo(accessToken: string): Promise<InstagramUser> {
    const params = new URLSearchParams({
      fields: 'id,username',
      access_token: accessToken,
    });

    const response = await fetch(`${this.baseUrl}/me?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get user info: ${error}`);
    }

    return response.json();
  }

  /**
   * Get Instagram Business Account ID from Facebook Pages
   */
  async getBusinessAccount(accessToken: string): Promise<InstagramBusinessAccount> {
    const params = new URLSearchParams({
      fields: 'instagram_business_account',
      access_token: accessToken,
    });

    const response = await fetch(`${this.baseUrl}/me/accounts?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get business account: ${error}`);
    }

    const data = await response.json();
    const pageWithInstagram = data.data.find(
      (page: { instagram_business_account?: { id: string } }) => page.instagram_business_account
    );

    if (!pageWithInstagram) {
      throw new Error('No Instagram Business Account found');
    }

    return pageWithInstagram;
  }

  /**
   * Upload image for Stories posting
   */
  async uploadStoryMedia(
    businessAccountId: string,
    accessToken: string,
    imageUrl: string
  ): Promise<InstagramStoryMediaResponse> {
    const params = new URLSearchParams({
      image_url: imageUrl,
      media_type: 'STORIES',
      access_token: accessToken,
    });

    const response = await fetch(
      `${this.baseUrl}/${businessAccountId}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to upload story media: ${error}`);
    }

    return response.json();
  }

  /**
   * Publish story media
   */
  async publishStoryMedia(
    businessAccountId: string,
    accessToken: string,
    creationId: string
  ): Promise<{ id: string }> {
    const params = new URLSearchParams({
      creation_id: creationId,
      access_token: accessToken,
    });

    const response = await fetch(
      `${this.baseUrl}/${businessAccountId}/media_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to publish story media: ${error}`);
    }

    return response.json();
  }

  /**
   * Post to Instagram Stories (complete flow)
   */
  async postToStories(
    businessAccountId: string,
    accessToken: string,
    imageUrl: string
  ): Promise<{ id: string }> {
    try {
      // Upload media
      const uploadResponse = await this.uploadStoryMedia(
        businessAccountId,
        accessToken,
        imageUrl
      );

      // Publish media
      const publishResponse = await this.publishStoryMedia(
        businessAccountId,
        accessToken,
        uploadResponse.id
      );

      return publishResponse;
    } catch (error) {
      console.error('Instagram Stories posting error:', error);
      throw error;
    }
  }

  /**
   * Check if token is expired or will expire soon
   */
  isTokenExpired(expiresAt: Date): boolean {
    const now = new Date();
    const bufferTime = 7 * 24 * 60 * 60 * 1000; // 7 days buffer
    return now.getTime() + bufferTime >= expiresAt.getTime();
  }

  /**
   * Get token expiration date
   */
  getTokenExpirationDate(expiresInSeconds: number): Date {
    return new Date(Date.now() + expiresInSeconds * 1000);
  }
}