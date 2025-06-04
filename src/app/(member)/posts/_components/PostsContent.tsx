'use client';

import { useState } from 'react';
import { Trash2, X, Square, CheckSquare } from 'lucide-react';
import { deleteMultiplePosts } from '../_actions/posts';
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
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedPosts(new Set());
  };

  const togglePostSelection = (postId: string) => {
    const newSelected = new Set(selectedPosts);
    if (newSelected.has(postId)) {
      newSelected.delete(postId);
    } else {
      newSelected.add(postId);
    }
    setSelectedPosts(newSelected);
  };

  const selectAllPosts = () => {
    if (selectedPosts.size === posts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(posts.map((post) => post.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPosts.size === 0) return;

    const confirmed = confirm(`選択した${selectedPosts.size}件の投稿を削除しますか？`);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const result = await deleteMultiplePosts(Array.from(selectedPosts));
      if (result.success) {
        setSelectedPosts(new Set());
        setIsSelectionMode(false);
      } else {
        alert(result.message);
      }
    } catch {
      alert('削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto">
      {/* アクションエリア */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          {isSelectionMode ? (
            <>
              <button
                onClick={selectAllPosts}
                className="flex items-center space-x-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                {selectedPosts.size === posts.length ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>全選択</span>
              </button>
              {selectedPosts.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="flex items-center space-x-2 px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? '削除中...' : `削除 (${selectedPosts.size})`}</span>
                </button>
              )}
              <button
                onClick={toggleSelectionMode}
                className="flex items-center space-x-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                <X className="w-4 h-4" />
                <span>キャンセル</span>
              </button>
            </>
          ) : (
            <button
              onClick={toggleSelectionMode}
              className="flex items-center space-x-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              <Square className="w-4 h-4" />
              <span>選択</span>
            </button>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <UploadDialog />
        </div>
      </div>

      {/* 投稿グリッド */}
      <PostGrid
        posts={posts}
        isSelectionMode={isSelectionMode}
        selectedPosts={selectedPosts}
        onToggleSelection={togglePostSelection}
      />
    </div>
  );
}
