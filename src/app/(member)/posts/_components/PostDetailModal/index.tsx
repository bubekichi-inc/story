'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/_components/ui/dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Trash2, Send } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';
import {
  updatePostImageOrder,
  deletePostImage,
  deletePost,
  updatePostImageTexts,
} from '../../_actions/posts';
import DraggableImageCard from './DraggableImageCard';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import { PostActionsDialog } from '../PostActionsDialog';
import type { Post, PostImage } from './types';

interface PostDetailModalProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  onPostDeleted: (postId: string) => void;
  onPostUpdated: (post: Post) => void;
}

export default function PostDetailModal({
  post,
  isOpen,
  onClose,
  onPostDeleted,
  onPostUpdated,
}: PostDetailModalProps) {
  const [images, setImages] = useState<PostImage[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // postが変更されたときにimagesを更新
  useEffect(() => {
    if (post) {
      const sortedImages = [...post.images].sort((a, b) => a.order - b.order);
      setImages(sortedImages);
    }
  }, [post]);

  // 保存成功メッセージを表示する関数
  const showSaveSuccessMessage = () => {
    setShowSaveSuccess(true);
    setTimeout(() => {
      setShowSaveSuccess(false);
    }, 3000); // 2秒後に非表示
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = images.findIndex((image) => image.id === active.id);
      const newIndex = images.findIndex((image) => image.id === over?.id);

      const newImages = arrayMove(images, oldIndex, newIndex);

      // 新しい順番でorderプロパティを更新
      const updatedImages = newImages.map((img, index) => ({
        ...img,
        order: index,
      }));

      setImages(updatedImages);

      // DBに順番を保存
      setIsUpdating(true);
      try {
        const result = await updatePostImageOrder(updatedImages.map((img) => img.id));
        if (result.success && post) {
          const updatedPost = {
            ...post,
            images: updatedImages,
          };
          onPostUpdated(updatedPost);
          showSaveSuccessMessage(); // 保存成功メッセージを表示
        } else {
          // エラーの場合は元に戻す
          setImages(images);
          console.error('画像順番の更新に失敗:', result.message);
        }
      } catch (error) {
        // エラーの場合は元に戻す
        setImages(images);
        console.error('画像順番の更新エラー:', error);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!post || images.length <= 1) {
      alert('投稿には最低1枚の画像が必要です');
      return;
    }

    setIsUpdating(true);
    try {
      const result = await deletePostImage(imageId);
      if (result.success) {
        const newImages = images.filter((img) => img.id !== imageId);
        setImages(newImages);

        const updatedPost = {
          ...post,
          images: newImages,
        };
        onPostUpdated(updatedPost);
      } else {
        console.error('画像の削除に失敗:', result.message);
        alert('画像の削除に失敗しました');
      }
    } catch (error) {
      console.error('画像の削除エラー:', error);
      alert('画像の削除に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;

    setIsUpdating(true);
    try {
      const result = await deletePost(post.id);
      if (result.success) {
        onPostDeleted(post.id);
        onClose();
      } else {
        console.error('投稿の削除に失敗:', result.message);
        alert('投稿の削除に失敗しました');
      }
    } catch (error) {
      console.error('投稿の削除エラー:', error);
      alert('投稿の削除に失敗しました');
    } finally {
      setIsUpdating(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleTextUpdate = async (imageId: string, threadsText?: string, xText?: string) => {
    try {
      const result = await updatePostImageTexts(imageId, threadsText, xText);
      if (result.success) {
        showSaveSuccessMessage(); // 保存成功メッセージを表示
      } else {
        console.error('テキストの更新に失敗:', result.message);
      }
    } catch (error) {
      console.error('テキストの更新エラー:', error);
    }
  };

  if (!post) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[90vw] max-h-[90vh] overflow-y-auto pt-20">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>画像一覧</span>
            <div className="flex item-center space-x-2">
              <PostActionsDialog postId={post.id}>
                <Button size="sm">
                  <Send className="w-4 h-4 mr-1" />
                  投稿する
                </Button>
              </PostActionsDialog>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isUpdating}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                投稿を削除
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 画像一覧 */}
          <div className="space-y-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
                <div className="space-y-4">
                  {images.map((image) => (
                    <DraggableImageCard
                      key={image.id}
                      image={image}
                      onDelete={handleDeleteImage}
                      onTextUpdate={handleTextUpdate}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>

        <DeleteConfirmDialog
          isOpen={showDeleteConfirm}
          isDeleting={isUpdating}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeletePost}
        />

        {/* 保存完了メッセージ */}
        {showSaveSuccess && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-3 py-2 rounded-md text-sm shadow-lg z-50 transition-opacity duration-300">
            保存完了
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
