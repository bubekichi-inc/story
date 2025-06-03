'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/_components/ui/card';
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
  createdAt: Date;
  updatedAt: Date;
  images: PostImage[];
}

interface DashboardContentProps {
  posts: Post[];
}

export default function DashboardContent({ posts }: DashboardContentProps) {
  // 統計データを計算
  const totalImages = posts.reduce((total, post) => total + post.images.length, 0);

  return (
    <div className="container mx-auto">
      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">総投稿数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{posts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">総画像数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalImages}</div>
          </CardContent>
        </Card>
      </div>

      {/* アクションエリア */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <UploadDialog />
        </div>
      </div>

      {/* 投稿グリッド */}
      <PostGrid posts={posts} />
    </div>
  );
}
