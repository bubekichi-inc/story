'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/app/_lib/supabase/server';
import { prisma } from '@/app/_lib/prisma';

type UploadResult = {
  success: boolean;
  message: string;
  postIds?: string[];
};

export async function createPost(formData: FormData): Promise<UploadResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: 'ログインが必要です',
    };
  }

  const files = formData.getAll('images') as File[];

  if (files.length === 0) {
    return {
      success: false,
      message: '画像を選択してください',
    };
  }

  try {
    // ストレージバケットの存在確認
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
      return {
        success: false,
        message: 'ストレージの確認に失敗しました',
      };
    }

    // story-imagesバケットが存在しない場合は作成を試行
    const hasStoryImagesBucket = buckets?.some((bucket) => bucket.name === 'story-images');
    if (!hasStoryImagesBucket) {
      const { error: createBucketError } = await supabase.storage.createBucket('story-images', {
        public: true,
        allowedMimeTypes: ['image/*'],
        fileSizeLimit: 5242880, // 5MB
      });

      if (createBucketError) {
        // バケット作成に失敗してもアップロードを試行
      }
    }

    // 各画像に対して個別のPostを作成
    const createdPosts = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // ファイルの検証
      if (!file || file.size === 0) {
        continue;
      }

      // ファイルがFile型であることを確認
      if (!(file instanceof File)) {
        continue;
      }

      // 各画像に対して新しいPostを作成
      const post = await prisma.post.create({
        data: {
          userId: user.id,
        },
      });

      // ファイル名を安全な形式に変換
      const sanitizedFileName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_')
        .toLowerCase();
      const fileName = `${user.id}/${Date.now()}-${i}-${sanitizedFileName}`;

      // Supabase Storageにアップロード
      const { error: uploadError } = await supabase.storage
        .from('story-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        // アップロードに失敗した場合、作成したPostを削除
        await prisma.post.delete({
          where: { id: post.id },
        });

        return {
          success: false,
          message: `ストレージアップロードエラー: ${uploadError.message}`,
        };
      }

      // 公開URLを取得
      const {
        data: { publicUrl },
      } = supabase.storage.from('story-images').getPublicUrl(fileName);

      // PostImageを作成（1つのPostに1つの画像）
      await prisma.postImage.create({
        data: {
          postId: post.id,
          imageUrl: publicUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          order: 0, // 各Postには1つの画像のみなので常に0
        },
      });

      createdPosts.push(post);
    }

    revalidatePath('/posts');
    return {
      success: true,
      message: `${createdPosts.length}件の投稿を作成しました`,
      postIds: createdPosts.map((post) => post.id),
    };
  } catch (error) {
    return {
      success: false,
      message: `投稿の作成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
    };
  }
}

export async function mergePostImages(): Promise<UploadResult> {
  return {
    success: false,
    message: 'この機能は新しいスキーマ構造では不要です',
  };
}

export async function deletePost(postId: string): Promise<UploadResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      success: false,
      message: 'ログインが必要です',
    };
  }

  try {
    // 投稿とその画像を取得
    const post = await prisma.post.findUnique({
      where: {
        id: postId,
        userId: user.id,
      },
      include: {
        images: true,
      },
    });

    if (!post) {
      return {
        success: false,
        message: '投稿が見つかりません',
      };
    }

    // Storageから画像を削除
    for (const image of post.images) {
      const fileName = image.imageUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from('story-images').remove([fileName]);
      }
    }

    // 投稿を削除（カスケードでPostImageも削除される）
    await prisma.post.delete({
      where: {
        id: postId,
        userId: user.id,
      },
    });

    revalidatePath('/posts');
    return {
      success: true,
      message: '投稿を削除しました',
    };
  } catch (error) {
    return {
      success: false,
      message: '投稿の削除に失敗しました',
    };
  }
}
