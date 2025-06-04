'use client';

import UploadDialog from './UploadDialog';
import PostGrid from './PostGrid';

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

interface PostsContentProps {
  posts: Post[];
}

export default function PostsContent({ posts }: PostsContentProps) {
  return (
    <div className="container mx-auto">
      {/* アクションエリア */}
      <div className="flex justify-end items-center mb-6">
        <div className="flex items-center space-x-4">
          <UploadDialog />
        </div>
      </div>

      {/* 投稿グリッド */}
      <PostGrid posts={posts} />
    </div>
  );
}
