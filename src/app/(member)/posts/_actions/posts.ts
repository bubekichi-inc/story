'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/app/_lib/supabase/server';
import { prisma } from '@/app/_lib/prisma';

type UploadResult = {
  success: boolean;
  message: string;
  postIds?: string[];
};

type SingleUploadResult = {
  success: boolean;
  message: string;
  postId?: string;
};

export async function createSinglePost(formData: FormData): Promise<SingleUploadResult> {
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

  const file = formData.get('image') as File;

  if (!file || file.size === 0) {
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

    // 現在のユーザーの最大orderを取得
    const maxOrderPost = await prisma.post.findFirst({
      where: { userId: user.id },
      orderBy: { order: 'desc' },
    });
    const nextOrder = (maxOrderPost?.order ?? -1) + 1;

    // 新しいPostを作成
    const post = await prisma.post.create({
      data: {
        userId: user.id,
        order: nextOrder,
      },
    });

    // ファイル名を安全な形式に変換
    const sanitizedFileName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
    const fileName = `${user.id}/${Date.now()}-${sanitizedFileName}`;

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

    // PostImageを作成
    await prisma.postImage.create({
      data: {
        postId: post.id,
        imageUrl: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        order: 0,
      },
    });

    revalidatePath('/posts');
    return {
      success: true,
      message: '投稿を作成しました',
      postId: post.id,
    };
  } catch (error) {
    return {
      success: false,
      message: `投稿の作成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
    };
  }
}

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

    // 現在のユーザーの最大orderを取得
    const maxOrderPost = await prisma.post.findFirst({
      where: { userId: user.id },
      orderBy: { order: 'desc' },
    });
    const baseOrder = (maxOrderPost?.order ?? -1) + 1;

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
          order: baseOrder + i,
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

export async function updatePostOrder(postIds: string[]): Promise<UploadResult> {
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
    // 一括更新でorderを設定
    const updatePromises = postIds.map((postId, index) =>
      prisma.post.update({
        where: {
          id: postId,
          userId: user.id, // ユーザーの投稿のみ更新可能
        },
        data: {
          order: index,
        },
      })
    );

    await Promise.all(updatePromises);

    revalidatePath('/posts');
    return {
      success: true,
      message: '順番を更新しました',
    };
  } catch {
    return {
      success: false,
      message: '順番の更新に失敗しました',
    };
  }
}

/**
 * 投稿画像の順番を更新する
 */
export async function updatePostImageOrder(
  imageIds: string[]
): Promise<{ success: boolean; message: string }> {
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
    // トランザクションで順番を更新
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < imageIds.length; i++) {
        await tx.postImage.update({
          where: {
            id: imageIds[i],
          },
          data: {
            order: i,
          },
        });
      }
    });

    revalidatePath('/posts');
    return {
      success: true,
      message: '画像の順番を更新しました',
    };
  } catch (error) {
    return {
      success: false,
      message: `順番の更新に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
    };
  }
}

/**
 * 投稿画像を削除する
 */
export async function deletePostImage(
  imageId: string
): Promise<{ success: boolean; message: string }> {
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
    // 画像の詳細を取得
    const image = await prisma.postImage.findUnique({
      where: { id: imageId },
      include: {
        post: true,
      },
    });

    if (!image || image.post.userId !== user.id) {
      return {
        success: false,
        message: '画像が見つからないか、権限がありません',
      };
    }

    // 投稿に含まれる画像の数をチェック
    const imageCount = await prisma.postImage.count({
      where: { postId: image.postId },
    });

    if (imageCount <= 1) {
      return {
        success: false,
        message: '投稿には最低1枚の画像が必要です',
      };
    }

    // Supabaseから画像ファイルを削除
    const fileName = image.imageUrl.split('/').pop();
    if (fileName) {
      const { error: deleteError } = await supabase.storage
        .from('posts')
        .remove([`${user.id}/${fileName}`]);

      if (deleteError) {
        console.error('Supabaseからの画像削除エラー:', deleteError);
      }
    }

    // データベースから画像を削除
    await prisma.postImage.delete({
      where: { id: imageId },
    });

    revalidatePath('/posts');
    return {
      success: true,
      message: '画像を削除しました',
    };
  } catch (error) {
    return {
      success: false,
      message: `画像の削除に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
    };
  }
}

/**
 * 投稿を削除する
 */
export async function deletePost(postId: string): Promise<{ success: boolean; message: string }> {
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
    // 投稿の詳細を取得
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        images: true,
      },
    });

    if (!post || post.userId !== user.id) {
      return {
        success: false,
        message: '投稿が見つからないか、権限がありません',
      };
    }

    // Supabaseから画像ファイルを削除
    const deletePromises = post.images.map(async (image) => {
      const fileName = image.imageUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from('posts').remove([`${user.id}/${fileName}`]);
      }
    });

    await Promise.all(deletePromises);

    // データベースから投稿を削除（画像もcascadeで削除される）
    await prisma.post.delete({
      where: { id: postId },
    });

    revalidatePath('/posts');
    return {
      success: true,
      message: '投稿を削除しました',
    };
  } catch (error) {
    return {
      success: false,
      message: `投稿の削除に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
    };
  }
}

export async function deleteMultiplePosts(postIds: string[]): Promise<UploadResult> {
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

  if (postIds.length === 0) {
    return {
      success: false,
      message: '削除する投稿が選択されていません',
    };
  }

  try {
    // 投稿とその画像を取得
    const posts = await prisma.post.findMany({
      where: {
        id: { in: postIds },
        userId: user.id,
      },
      include: {
        images: true,
      },
    });

    if (posts.length === 0) {
      return {
        success: false,
        message: '削除可能な投稿が見つかりません',
      };
    }

    // Storageから画像を削除
    const deletePromises = [];
    for (const post of posts) {
      for (const image of post.images) {
        // URLからファイル名を抽出
        const urlParts = image.imageUrl.split('/');
        const fileName = urlParts.slice(-2).join('/'); // "userId/filename" の形式
        if (fileName) {
          deletePromises.push(supabase.storage.from('story-images').remove([fileName]));
        }
      }
    }

    // ストレージから画像を削除
    await Promise.all(deletePromises);

    // 投稿を削除（カスケードでPostImageも削除される）
    await prisma.post.deleteMany({
      where: {
        id: { in: postIds },
        userId: user.id,
      },
    });

    revalidatePath('/posts');
    return {
      success: true,
      message: `${posts.length}件の投稿を削除しました`,
    };
  } catch (error) {
    return {
      success: false,
      message: `投稿の削除に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
    };
  }
}

export async function mergePosts(
  postIds: string[]
): Promise<{ success: boolean; message: string }> {
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

  if (postIds.length < 2) {
    return {
      success: false,
      message: '統合するには2つ以上の投稿を選択してください',
    };
  }

  try {
    // 統合対象の投稿と画像を取得
    const posts = await prisma.post.findMany({
      where: {
        id: { in: postIds },
        userId: user.id,
      },
      include: {
        images: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (posts.length < 2) {
      return {
        success: false,
        message: '統合可能な投稿が見つかりません',
      };
    }

    // 新しい投稿の order を取得
    const maxOrder = await prisma.post.findFirst({
      where: { userId: user.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const newOrder = (maxOrder?.order ?? 0) + 1;

    // 全ての画像を収集し、新しい order を付与
    const allImages = posts.flatMap((post) => post.images);
    const mergedImagesData = allImages.map((image, index) => ({
      imageUrl: image.imageUrl,
      fileName: image.fileName,
      fileSize: image.fileSize,
      mimeType: image.mimeType,
      order: index + 1,
    }));

    // トランザクションで新しい投稿を作成し、古い投稿を削除
    await prisma.$transaction(async (tx) => {
      // 新しい投稿を作成
      await tx.post.create({
        data: {
          userId: user.id,
          order: newOrder,
          images: {
            create: mergedImagesData,
          },
        },
      });

      // 元の投稿を削除（画像も cascade で削除される）
      await tx.post.deleteMany({
        where: {
          id: { in: postIds },
          userId: user.id,
        },
      });
    });

    revalidatePath('/posts');
    return {
      success: true,
      message: `${posts.length}件の投稿を1つに統合しました`,
    };
  } catch (error) {
    return {
      success: false,
      message: `投稿の統合に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
    };
  }
}

/**
 * 投稿画像のThreads用とX用のテキストを更新する
 */
export async function updatePostImageTexts(
  imageId: string,
  threadsText?: string,
  xText?: string
): Promise<{ success: boolean; message: string }> {
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
    // 画像の詳細を取得
    const image = await prisma.postImage.findUnique({
      where: { id: imageId },
      include: {
        post: true,
      },
    });

    if (!image || image.post.userId !== user.id) {
      return {
        success: false,
        message: '画像が見つからないか、権限がありません',
      };
    }

    // 画像のテキストを更新
    await prisma.postImage.update({
      where: { id: imageId },
      data: {
        threadsText: threadsText || null,
        xText: xText || null,
      },
    });

    revalidatePath('/posts');
    return {
      success: true,
      message: 'テキストを更新しました',
    };
  } catch (error) {
    return {
      success: false,
      message: `テキストの更新に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
    };
  }
}
