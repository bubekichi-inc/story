'use client';

import { Calendar, Copy } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// ドラッグアンドドロップ機能を持つコンポーネントを動的にインポート
const DraggablePostGrid = dynamic(() => import('./DraggablePostGrid'), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="relative group">
          <div className="aspect-[9/16] relative overflow-hidden shadow-card bg-gray-200 animate-pulse">
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300"></div>
          </div>
        </div>
      ))}
    </div>
  ),
});

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
  order: number;
  createdAt: Date;
  updatedAt: Date;
  images: PostImage[];
}

interface PostGridProps {
  posts: Post[];
}

// SSR用の静的なPostCard（ドラッグ機能なし）
function StaticPostCard({ post }: { post: Post }) {
  const images = post.images.sort((a, b) => a.order - b.order);

  return (
    <div className="relative group cursor-pointer">
      {/* メイン画像 */}
      <div className="aspect-[9/16] relative overflow-hidden shadow-card">
        <Image
          src={images[0].imageUrl}
          alt={images[0].fileName}
          height={800}
          width={450}
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 20vw, 20vw"
        />

        {/* 複数枚アイコン */}
        {images.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5">
            <Copy className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function PostGrid({ posts }: PostGridProps) {
  const [isMounted, setIsMounted] = useState(false);

  // クライアント側でのみマウントされるかどうかを判定
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (posts.length === 0) {
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

  // SSR時とクライアント初期レンダリング時は静的なグリッドを表示
  if (!isMounted) {
    return (
      <div className="grid grid-cols-5 gap-4">
        {posts.map((post) => (
          <StaticPostCard key={post.id} post={post} />
        ))}
      </div>
    );
  }

  // クライアント側でマウント後はドラッグアンドドロップ対応のグリッドを表示
  return <DraggablePostGrid posts={posts} />;
}
