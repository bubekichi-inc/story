'use client';

import { Calendar } from 'lucide-react';
import Image from 'next/image';

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

function PostCard({ post }: { post: Post }) {
  const images = post.images.sort((a, b) => a.order - b.order);

  return (
    <div className="relative group cursor-pointer">
      {/* メイン画像（一番手前） */}
      <div className="aspect-[9/16] relative overflow-hidden">
        <Image
          src={images[0].imageUrl}
          alt={images[0].fileName}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 20vw, 20vw"
        />
      </div>

      {/* 複数画像がある場合の重なり効果 */}
      {images.length > 1 && (
        <>
          {/* 2枚目 */}
          <div className="absolute top-1 right-1 aspect-[9/16] w-[95%] overflow-hidden rounded-lg -z-10">
            <Image
              src={images[1].imageUrl}
              alt={images[1].fileName}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 20vw, 20vw"
            />
          </div>

          {/* 3枚目以降がある場合 */}
          {images.length > 2 && (
            <div className="absolute top-2 right-2 aspect-[9/16] w-[90%] overflow-hidden rounded-lg -z-20">
              <Image
                src={images[2].imageUrl}
                alt={images[2].fileName}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 20vw, 20vw"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PostGrid({ posts }: PostGridProps) {
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

  return (
    <div className="grid grid-cols-5 gap-4">
      {posts
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
    </div>
  );
}
