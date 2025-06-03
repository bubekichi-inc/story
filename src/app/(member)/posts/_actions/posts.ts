'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

type UploadResult = {
  success: boolean;
  message: string;
  postId?: string;
};

export async function createPost(formData: FormData): Promise<UploadResult> {
  console.log('Server: createPost called');
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log('Server: Auth check result:', {
    hasUser: !!user,
    userId: user?.id,
    authError: authError?.message,
  });

  if (authError || !user) {
    return {
      success: false,
      message: 'ログインが必要です',
    };
  }

  // FormDataの詳細確認
  console.log('Server: FormData keys:', Array.from(formData.keys()));
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      console.log(`Server: FormData[${key}]:`, {
        name: value.name,
        size: value.size,
        type: value.type,
        lastModified: value.lastModified,
      });
    } else {
      console.log(`Server: FormData[${key}]:`, value);
    }
  }

  const files = formData.getAll('images') as File[];

  console.log('Server: Received files count:', files.length);
  console.log(
    'Server: Files details:',
    files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      constructor: f.constructor.name,
    }))
  );

  if (files.length === 0) {
    console.log('Server: No files received');
    return {
      success: false,
      message: '画像を選択してください',
    };
  }

  try {
    // ストレージバケットの存在確認
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    console.log(
      'Server: Available buckets:',
      buckets?.map((b) => b.name)
    );
    if (bucketError) {
      console.error('Server: Bucket list error:', bucketError);
    }

    // story-imagesバケットが存在しない場合は作成を試行
    const hasStoryImagesBucket = buckets?.some((bucket) => bucket.name === 'story-images');
    if (!hasStoryImagesBucket) {
      console.log('Server: Creating story-images bucket...');
      const { data: createBucketData, error: createBucketError } =
        await supabase.storage.createBucket('story-images', {
          public: true,
          allowedMimeTypes: ['image/*'],
          fileSizeLimit: 5242880, // 5MB
        });

      if (createBucketError) {
        console.error('Server: Failed to create bucket:', createBucketError);
        // バケット作成に失敗してもアップロードを試行
      } else {
        console.log('Server: Bucket created successfully:', createBucketData);
      }
    }

    // まず投稿を作成
    const post = await prisma.post.create({
      data: {
        userId: user.id,
      },
    });

    console.log('Server: Post created:', post.id);

    // 各画像をPostImageとして保存
    const createdImages = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      console.log(`Server: Processing file ${i + 1}/${files.length}:`, file.name);

      // ファイルの検証
      if (!file || file.size === 0) {
        console.error('Server: Invalid file:', file);
        continue;
      }

      // ファイルがFile型であることを確認
      if (!(file instanceof File)) {
        console.error('Server: Not a File object:', typeof file, file);
        continue;
      }

      console.log('Server: File validation passed:', {
        isFile: file instanceof File,
        hasArrayBuffer: typeof file.arrayBuffer === 'function',
        hasStream: typeof file.stream === 'function',
      });

      // ファイル名を安全な形式に変換
      const sanitizedFileName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_')
        .toLowerCase();
      const fileName = `${user.id}/${Date.now()}-${i}-${sanitizedFileName}`;
      console.log('Server: Storage filename:', fileName);

      // Supabase Storageにアップロード
      console.log('Server: Attempting to upload to storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('story-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Server: Upload error details:', {
          message: uploadError.message,
          error: uploadError,
          fileName,
          fileSize: file.size,
          fileType: file.type,
        });
        return {
          success: false,
          message: `ストレージアップロードエラー: ${uploadError.message}`,
        };
      }

      console.log('Server: Upload success:', uploadData);

      console.log('Server: File uploaded successfully');

      // 公開URLを取得
      const {
        data: { publicUrl },
      } = supabase.storage.from('story-images').getPublicUrl(fileName);

      console.log('Server: Public URL generated:', publicUrl);

      // PostImageを作成
      const postImage = await prisma.postImage.create({
        data: {
          postId: post.id,
          imageUrl: publicUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          order: i,
        },
      });

      console.log('Server: PostImage created:', postImage.id);
      createdImages.push(postImage);
    }

    console.log('Server: Total images created:', createdImages.length);
    revalidatePath('/posts');
    return {
      success: true,
      message: `${createdImages.length}枚の画像をアップロードしました`,
      postId: post.id,
    };
  } catch (error) {
    console.error('Server: Failed to create post:', error);
    return {
      success: false,
      message: `画像のアップロードに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
    };
  }
}

export async function mergePostImages(): Promise<UploadResult> {
  // 新しいスキーマ構造では、複数の画像が既に1つのPostに属している
  // この機能は不要になったため、無効化
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
    console.error('Failed to delete post:', error);
    return {
      success: false,
      message: '投稿の削除に失敗しました',
    };
  }
}
