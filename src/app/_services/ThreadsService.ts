interface ThreadsPostOptions {
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  linkAttachment?: string;
}

interface ThreadsMediaContainer {
  id: string;
}

interface ThreadsPublishResult {
  id: string;
}

export class ThreadsService {
  private accessToken: string;
  private userId: string;

  constructor(accessToken: string, userId: string) {
    this.accessToken = accessToken;
    this.userId = userId;
  }

  /**
   * テキストのみの投稿を作成
   */
  async createTextPost(text: string, linkAttachment?: string): Promise<string> {
    try {
      // Step 1: メディアコンテナを作成
      const containerResponse = await fetch(
        `https://graph.threads.net/v1.0/${this.userId}/threads`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            media_type: 'TEXT',
            text: text,
            access_token: this.accessToken,
            ...(linkAttachment && { link_attachment: linkAttachment }),
          }),
        }
      );

      if (!containerResponse.ok) {
        const errorData = await containerResponse.text();
        throw new Error(`Failed to create text container: ${errorData}`);
      }

      const containerData: ThreadsMediaContainer = await containerResponse.json();

      // Step 2: コンテナを公開
      await this.waitForProcessing(); // 30秒待機
      return await this.publishContainer(containerData.id);
    } catch (error) {
      console.error('Threads text post error:', error);
      throw error;
    }
  }

  /**
   * 画像付き投稿を作成
   */
  async createImagePost(imageUrl: string, text?: string): Promise<string> {
    try {
      // Step 1: メディアコンテナを作成
      const containerResponse = await fetch(
        `https://graph.threads.net/v1.0/${this.userId}/threads`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            media_type: 'IMAGE',
            image_url: imageUrl,
            access_token: this.accessToken,
            ...(text && { text }),
          }),
        }
      );

      if (!containerResponse.ok) {
        const errorData = await containerResponse.text();
        throw new Error(`Failed to create image container: ${errorData}`);
      }

      const containerData: ThreadsMediaContainer = await containerResponse.json();

      // Step 2: コンテナを公開
      await this.waitForProcessing(); // 30秒待機
      return await this.publishContainer(containerData.id);
    } catch (error) {
      console.error('Threads image post error:', error);
      throw error;
    }
  }

  /**
   * 動画付き投稿を作成
   */
  async createVideoPost(videoUrl: string, text?: string): Promise<string> {
    try {
      // Step 1: メディアコンテナを作成
      const containerResponse = await fetch(
        `https://graph.threads.net/v1.0/${this.userId}/threads`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            media_type: 'VIDEO',
            video_url: videoUrl,
            access_token: this.accessToken,
            ...(text && { text }),
          }),
        }
      );

      if (!containerResponse.ok) {
        const errorData = await containerResponse.text();
        throw new Error(`Failed to create video container: ${errorData}`);
      }

      const containerData: ThreadsMediaContainer = await containerResponse.json();

      // Step 2: コンテナを公開
      await this.waitForProcessing(); // 30秒待機
      return await this.publishContainer(containerData.id);
    } catch (error) {
      console.error('Threads video post error:', error);
      throw error;
    }
  }

  /**
   * カルーセル投稿を作成
   */
  async createCarouselPost(
    items: Array<{ type: 'IMAGE' | 'VIDEO'; url: string }>,
    text?: string
  ): Promise<string> {
    try {
      if (items.length < 2 || items.length > 20) {
        throw new Error('Carousel must have between 2 and 20 items');
      }

      // Step 1: 各アイテムのコンテナを作成
      const itemContainerIds: string[] = [];

      for (const item of items) {
        const containerResponse = await fetch(
          `https://graph.threads.net/v1.0/${this.userId}/threads`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              media_type: item.type,
              is_carousel_item: 'true',
              access_token: this.accessToken,
              ...(item.type === 'IMAGE' ? { image_url: item.url } : { video_url: item.url }),
            }),
          }
        );

        if (!containerResponse.ok) {
          const errorData = await containerResponse.text();
          throw new Error(`Failed to create item container: ${errorData}`);
        }

        const containerData: ThreadsMediaContainer = await containerResponse.json();
        itemContainerIds.push(containerData.id);
      }

      // Step 2: カルーセルコンテナを作成
      const carouselResponse = await fetch(
        `https://graph.threads.net/v1.0/${this.userId}/threads`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            media_type: 'CAROUSEL',
            children: itemContainerIds.join(','),
            access_token: this.accessToken,
            ...(text && { text }),
          }),
        }
      );

      if (!carouselResponse.ok) {
        const errorData = await carouselResponse.text();
        throw new Error(`Failed to create carousel container: ${errorData}`);
      }

      const carouselData: ThreadsMediaContainer = await carouselResponse.json();

      // Step 3: カルーセルを公開
      await this.waitForProcessing(); // 30秒待機
      return await this.publishContainer(carouselData.id);
    } catch (error) {
      console.error('Threads carousel post error:', error);
      throw error;
    }
  }

  /**
   * コンテナを公開
   */
  private async publishContainer(containerId: string): Promise<string> {
    const publishResponse = await fetch(
      `https://graph.threads.net/v1.0/${this.userId}/threads_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          creation_id: containerId,
          access_token: this.accessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      const errorData = await publishResponse.text();
      throw new Error(`Failed to publish container: ${errorData}`);
    }

    const publishData: ThreadsPublishResult = await publishResponse.json();
    return publishData.id;
  }

  /**
   * メディア処理完了まで待機
   */
  private async waitForProcessing(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 30000)); // 30秒待機
  }

  /**
   * メディアコンテナのステータスを確認
   */
  async getContainerStatus(containerId: string): Promise<{ status: string }> {
    const response = await fetch(
      `https://graph.threads.net/v1.0/${containerId}?fields=status&access_token=${this.accessToken}`
    );

    if (!response.ok) {
      throw new Error('Failed to get container status');
    }

    return await response.json();
  }

  /**
   * 投稿情報を取得
   */
  async getPost(postId: string): Promise<any> {
    const response = await fetch(
      `https://graph.threads.net/v1.0/${postId}?fields=id,text,permalink,timestamp&access_token=${this.accessToken}`
    );

    if (!response.ok) {
      throw new Error('Failed to get post');
    }

    return await response.json();
  }

  /**
   * ユーザー情報を取得
   */
  async getUserInfo(): Promise<{ id: string; username: string }> {
    const response = await fetch(
      `https://graph.threads.net/v1.0/${this.userId}?fields=id,username&access_token=${this.accessToken}`
    );

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return await response.json();
  }
}
