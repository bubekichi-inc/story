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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, Trash2, GripVertical, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/app/_components/ui/button';
import { updatePostImageOrder, deletePostImage, deletePost } from '../_actions/posts';

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

interface PostDetailModalProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  onPostDeleted: (postId: string) => void;
  onPostUpdated: (post: Post) => void;
}

function DraggableImageCard({
  image,
  onDelete,
}: {
  image: PostImage;
  onDelete: (imageId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(image.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="relative group aspect-[9/16] overflow-hidden cursor-grab active:cursor-grabbing"
    >
      {/* ドラッグハンドル領域（削除ボタン以外） */}
      <div
        {...listeners}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{ zIndex: 1 }}
      />

      {/* 削除ボタン */}
      <button
        onClick={handleDeleteClick}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-2 right-2 z-20 bg-red-500 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 pointer-events-auto"
        style={{ pointerEvents: 'auto' }}
      >
        <X className="w-4 h-4 text-white" />
      </button>

      {/* 画像 */}
      <Image
        src={image.imageUrl}
        alt={image.fileName}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 50vw, 25vw"
      />
    </div>
  );
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

  if (!post) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[90vw] max-h-[90vh] overflow-y-auto pt-20">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>投稿詳細</span>
            <div className="flex items-center space-x-2">
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
          {/* 投稿情報 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">投稿日時:</span>
                <p className="text-gray-900">{new Date(post.createdAt).toLocaleString('ja-JP')}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">更新日時:</span>
                <p className="text-gray-900">{new Date(post.updatedAt).toLocaleString('ja-JP')}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">画像数:</span>
                <p className="text-gray-900">{images.length}枚</p>
              </div>
            </div>
          </div>

          {/* 画像一覧 */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">画像一覧</h3>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((image) => (
                    <DraggableImageCard key={image.id} image={image} onDelete={handleDeleteImage} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* 投稿削除確認ダイアログ */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-semibold">投稿を削除</h3>
              </div>
              <p className="text-gray-600 mb-6">
                この投稿を削除しますか？この操作は取り消せません。
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isUpdating}
                >
                  キャンセル
                </Button>
                <Button variant="destructive" onClick={handleDeletePost} disabled={isUpdating}>
                  削除する
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
