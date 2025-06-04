'use client';

import { Calendar, Copy } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import PostDetailModal from './PostDetailModal';

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
  isSelectionMode?: boolean;
  selectedPosts?: Set<string>;
  onToggleSelection?: (postId: string) => void;
  onPostDeleted?: (postId: string) => void;
  onPostUpdated?: (post: Post) => void;
}

// SSR用の静的なPostCard（ドラッグ機能なし）
function StaticPostCard({
  post,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection,
  onPostClick,
}: {
  post: Post;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
  onPostClick?: (post: Post) => void;
}) {
  const images = post.images.sort((a, b) => a.order - b.order);

  const handleClick = () => {
    if (isSelectionMode) {
      onToggleSelection?.();
    } else {
      onPostClick?.(post);
    }
  };

  return (
    <div
      className={`relative group cursor-pointer ${isSelectionMode ? 'select-none' : ''}`}
      onClick={handleClick}
    >
      {/* 選択チェックボックス */}
      {isSelectionMode && (
        <div className="absolute top-2 left-2 z-10">
          <div
            className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
              isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300'
            }`}
          >
            {isSelected && (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* 選択時のオーバーレイ */}
      {isSelectionMode && isSelected && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 z-5"></div>
      )}

      {/* メイン画像 */}
      <div className="aspect-[9/16] relative overflow-hidden shadow-card pointer-events-none">
        <Image
          src={images[0].imageUrl}
          alt={images[0].fileName}
          height={800}
          width={450}
          className="object-cover pointer-events-none"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 20vw, 20vw"
        />

        {/* 複数枚アイコン */}
        {images.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5 pointer-events-none">
            <Copy className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function PostGrid({
  posts,
  isSelectionMode = false,
  selectedPosts = new Set(),
  onToggleSelection,
  onPostDeleted,
  onPostUpdated,
}: PostGridProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // クライアント側でのみマウントされるかどうかを判定
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
  };

  const handlePostDeleted = (postId: string) => {
    onPostDeleted?.(postId);
  };

  const handlePostUpdated = (updatedPost: Post) => {
    onPostUpdated?.(updatedPost);
  };

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
          <StaticPostCard
            key={post.id}
            post={post}
            isSelectionMode={isSelectionMode}
            isSelected={selectedPosts.has(post.id)}
            onToggleSelection={() => onToggleSelection?.(post.id)}
            onPostClick={handlePostClick}
          />
        ))}
      </div>
    );
  }

  // クライアント側でマウント後はドラッグアンドドロップ対応のグリッドを表示
  return (
    <>
      <DraggablePostGrid
        posts={posts}
        isSelectionMode={isSelectionMode}
        selectedPosts={selectedPosts}
        onToggleSelection={onToggleSelection}
        onPostClick={handlePostClick}
      />
      <PostDetailModal
        post={selectedPost}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onPostDeleted={handlePostDeleted}
        onPostUpdated={handlePostUpdated}
      />
    </>
  );
}
