interface ThreadsMediaContainer {
  id: string;
}

interface ThreadsPublishResult {
  id: string;
}

interface ThreadsPost {
  id: string;
  text: string;
  permalink: string;
  timestamp: string;
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
      const containerResponse = await fetch(`https://graph.threads.net/v1.0/me/threads`, {
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
      });

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
   * コンテナを公開
   */
  private async publishContainer(containerId: string): Promise<string> {
    const publishResponse = await fetch(`https://graph.threads.net/v1.0/me/threads_publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        creation_id: containerId,
        access_token: this.accessToken,
      }),
    });

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
  async getPost(postId: string): Promise<ThreadsPost> {
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
      `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${this.accessToken}`
    );

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return await response.json();
  }
}
