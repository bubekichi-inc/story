'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/app/_components/ui/card';
import { Button } from '@/app/_components/ui/button';
import { deletePost } from '@/app/(member)/posts/_actions/posts';
import { Calendar, Trash2 } from 'lucide-react';

interface PostImage {
  id: string;
  postId: string;
  imageUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  order: number;
  createdAt: Date;
}

interface Post {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  images: PostImage[];
}

interface PostGridProps {
  posts: Post[];
}

// カラーパレット（PostのIDに基づいて一意の色を生成）
const getPostColor = (postId: string): string => {
  const colors = [
    'bg-red-50 border-red-200',
    'bg-blue-50 border-blue-200',
    'bg-green-50 border-green-200',
    'bg-yellow-50 border-yellow-200',
    'bg-purple-50 border-purple-200',
    'bg-pink-50 border-pink-200',
    'bg-indigo-50 border-indigo-200',
    'bg-orange-50 border-orange-200',
    'bg-teal-50 border-teal-200',
    'bg-cyan-50 border-cyan-200',
  ];

  // PostIDをハッシュ化して色を決定
  let hash = 0;
  for (let i = 0; i < postId.length; i++) {
    hash = (hash << 5) - hash + postId.charCodeAt(i);
    hash = hash & hash; // 32bit整数に変換
  }
  return colors[Math.abs(hash) % colors.length];
};

function PostImageCard({
  image,
  post,
  onDeletePost,
}: {
  image: PostImage;
  post: Post;
  onDeletePost: (postId: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const postColor = getPostColor(post.id);

  const handleDelete = async () => {
    if (!confirm(`この投稿（${post.images.length}枚）を削除しますか？`)) return;

    setLoading(true);
    try {
      await onDeletePost(post.id);
    } catch (error) {
      console.error('Failed to delete post:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      className={`group relative cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${postColor}`}
    >
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="sm" variant="destructive" onClick={handleDelete} disabled={loading}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <CardContent className="p-0">
        {/* 画像プレビュー */}
        <div className="aspect-square relative overflow-hidden rounded-t-lg">
          <img src={image.imageUrl} alt={image.fileName} className="w-full h-full object-cover" />

          {/* PostID表示（同じPostの識別用） */}
          <div className="absolute bottom-2 left-2">
            <div className="bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
              Post {post.id.slice(-4)}
            </div>
          </div>

          {/* 複数画像がある場合の枚数表示 */}
          {post.images.length > 1 && (
            <div className="absolute top-2 left-2">
              <div className="bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                {image.order + 1}/{post.images.length}
              </div>
            </div>
          )}
        </div>

        {/* 画像情報 */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 truncate">{image.fileName}</h3>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>{(image.fileSize / 1024 / 1024).toFixed(1)} MB</span>
            <span>{new Date(post.createdAt).toLocaleDateString('ja-JP')}</span>
          </div>

          {/* Post情報 */}
          {post.images.length > 1 && (
            <div className="text-xs text-gray-500 border-t pt-2">
              このPostには{post.images.length}枚の画像があります
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PostGrid({ posts }: PostGridProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleDeletePost = async (postId: string) => {
    setLoading(postId);
    try {
      await deletePost(postId);
    } catch (error) {
      console.error('Failed to delete post:', error);
    } finally {
      setLoading(null);
    }
  };

  // 全てのPostImageを一つの配列にまとめる
  const allImages = posts.flatMap((post) => post.images.map((image) => ({ image, post })));

  if (allImages.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <Calendar className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">まだ投稿がありません</h3>
        <p className="text-gray-600">最初の画像をアップロードして始めましょう！</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 統計情報 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-900">
              {posts.length}件の投稿、{allImages.length}枚の画像
            </h4>
            <p className="text-sm text-gray-600">
              同じ投稿の画像は同じ色の背景でグルーピングされています
            </p>
          </div>
        </div>
      </div>

      {/* 画像グリッド */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {allImages
          .sort((a, b) => {
            // まずPostの作成日時でソート、次にorder番号でソート
            const dateCompare =
              new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime();
            if (dateCompare !== 0) return dateCompare;
            return a.image.order - b.image.order;
          })
          .map(({ image, post }) => (
            <PostImageCard
              key={image.id}
              image={image}
              post={post}
              onDeletePost={handleDeletePost}
            />
          ))}
      </div>
    </div>
  );
}
