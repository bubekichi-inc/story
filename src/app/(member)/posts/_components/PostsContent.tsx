'use client';

import { useState, useEffect } from 'react';
import { deleteMultiplePosts, mergePosts } from '../_actions/posts';
import UploadDialog from './UploadDialog';
import PostGrid from './PostGrid';
import SelectionActions from './SelectionActions';

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
  const [currentPosts, setCurrentPosts] = useState(posts);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  // propsが変更されたときにstateを更新
  useEffect(() => {
    setCurrentPosts(posts);
  }, [posts]);

  const handlePostDeleted = (postId: string) => {
    setCurrentPosts(currentPosts.filter((post) => post.id !== postId));
    const newSelected = new Set(selectedPosts);
    newSelected.delete(postId);
    setSelectedPosts(newSelected);
  };

  const handlePostUpdated = (updatedPost: Post) => {
    setCurrentPosts(currentPosts.map((post) => (post.id === updatedPost.id ? updatedPost : post)));
  };

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
    if (selectedPosts.size === currentPosts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(currentPosts.map((post) => post.id)));
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

  const handleMergePosts = async () => {
    if (selectedPosts.size < 2) return;

    const confirmed = confirm(`選択した${selectedPosts.size}件の投稿を1つにまとめますか？`);
    if (!confirmed) return;

    setIsMerging(true);
    try {
      const result = await mergePosts(Array.from(selectedPosts));
      if (result.success) {
        setSelectedPosts(new Set());
        setIsSelectionMode(false);
      } else {
        alert(result.message);
      }
    } catch {
      alert('統合に失敗しました');
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="container mx-auto">
      {/* アクションエリア */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-6">
          <div className="">
            <p className="text-sm text-gray-600">全{currentPosts.length} 件</p>
          </div>
          {currentPosts.length > 0 && (
            <SelectionActions
              isSelectionMode={isSelectionMode}
              selectedPosts={selectedPosts}
              totalPosts={currentPosts.length}
              isDeleting={isDeleting}
              isMerging={isMerging}
              onSelectAll={selectAllPosts}
              onBulkDelete={handleBulkDelete}
              onMergePosts={handleMergePosts}
              onToggleSelectionMode={toggleSelectionMode}
            />
          )}
        </div>
        <div className="flex items-center space-x-6">
          <UploadDialog />
        </div>
      </div>

      {/* 投稿グリッド */}
      <PostGrid
        posts={currentPosts}
        isSelectionMode={isSelectionMode}
        selectedPosts={selectedPosts}
        onToggleSelection={togglePostSelection}
        onPostDeleted={handlePostDeleted}
        onPostUpdated={handlePostUpdated}
      />
    </div>
  );
}
