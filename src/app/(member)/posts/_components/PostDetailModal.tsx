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
import { Textarea } from '@/app/_components/ui/textarea';
import {
  updatePostImageOrder,
  deletePostImage,
  deletePost,
  updatePostImageTexts,
} from '../_actions/posts';

interface PostImage {
  id: string;
  postId: string;
  imageUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  order: number;
  threadsText?: string | null;
  xText?: string | null;
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
  onTextUpdate,
}: {
  image: PostImage;
  onDelete: (imageId: string) => void;
  onTextUpdate: (imageId: string, threadsText?: string, xText?: string) => void;
}) {
  const [showThreadsText, setShowThreadsText] = useState(!!image.threadsText);
  const [showXText, setShowXText] = useState(!!image.xText);
  const [threadsText, setThreadsText] = useState(image.threadsText || '');
  const [xText, setXText] = useState(image.xText || '');

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

  const handleTextUpdate = async () => {
    const threads = showThreadsText ? threadsText : undefined;
    const x = showXText ? xText : undefined;
    await onTextUpdate(image.id, threads, x);
  };

  // チェックボックスの状態が変わったときに自動保存
  useEffect(() => {
    handleTextUpdate();
  }, [showThreadsText, showXText]);

  const handleThreadsTextChange = (value: string) => {
    setThreadsText(value);
  };

  const handleXTextChange = (value: string) => {
    setXText(value);
  };

  // テキストが変更されたら自動保存（デバウンス）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showThreadsText || showXText) {
        handleTextUpdate();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [threadsText, xText]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex gap-4 p-4 border rounded-lg bg-white"
    >
      {/* 左側：画像 */}
      <div className="relative group w-48 aspect-[9/16] overflow-hidden flex-shrink-0">
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

        {/* ドラッグハンドルアイコン */}
        <div
          {...listeners}
          className="absolute top-2 left-2 z-20 bg-gray-700 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4 text-white" />
        </div>

        {/* 画像 */}
        <Image
          src={image.imageUrl}
          alt={image.fileName}
          fill
          className="object-cover"
          sizes="192px"
        />
      </div>

      {/* 右側：テキストエリア */}
      <div className="flex-1 space-y-4">
        {/* Threadsチェックボックスとテキストエリア */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showThreadsText}
              onChange={(e) => setShowThreadsText(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium">Threadsに投稿</span>
          </label>
          {showThreadsText && (
            <Textarea
              value={threadsText}
              onChange={(e) => handleThreadsTextChange(e.target.value)}
              placeholder="Threads用のテキストを入力..."
              className="min-h-20"
            />
          )}
        </div>

        {/* Xチェックボックスとテキストエリア */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showXText}
              onChange={(e) => setShowXText(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium">Xに投稿</span>
          </label>
          {showXText && (
            <Textarea
              value={xText}
              onChange={(e) => handleXTextChange(e.target.value)}
              placeholder="X用のテキストを入力..."
              className="min-h-20"
            />
          )}
        </div>
      </div>
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

  const handleTextUpdate = async (imageId: string, threadsText?: string, xText?: string) => {
    try {
      const result = await updatePostImageTexts(imageId, threadsText, xText);
      if (result.success) {
        // 成功時は特に何もしない（自動保存）
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
