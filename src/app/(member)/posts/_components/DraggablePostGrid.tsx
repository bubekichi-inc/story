'use client';

import { useState, useEffect } from 'react';
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
import { updatePostOrder } from '../_actions/posts';
import { Copy } from 'lucide-react';
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
  order: number;
  createdAt: Date;
  updatedAt: Date;
  images: PostImage[];
}

interface DraggablePostGridProps {
  posts: Post[];
  isSelectionMode?: boolean;
  selectedPosts?: Set<string>;
  onToggleSelection?: (postId: string) => void;
  onPostClick?: (post: Post) => void;
}

function DraggablePostCard({
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: post.id,
    disabled: isSelectionMode, // 選択モード時はドラッグを無効化
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const images = post.images.sort((a, b) => a.order - b.order);

  const handleClick = (e: React.MouseEvent) => {
    // ドラッグ中はクリックを無効にする
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (isSelectionMode) {
      onToggleSelection?.();
    } else {
      onPostClick?.(post);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!isSelectionMode ? { ...attributes, ...listeners } : {})}
      className={`relative group ${
        isSelectionMode ? 'cursor-pointer select-none' : 'cursor-grab active:cursor-grabbing'
      }`}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
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

export default function DraggablePostGrid({
  posts,
  isSelectionMode = false,
  selectedPosts = new Set(),
  onToggleSelection,
  onPostClick,
}: DraggablePostGridProps) {
  const [items, setItems] = useState(posts);
  const [isUpdating, setIsUpdating] = useState(false);

  // propsが変更されたときにstateを更新
  useEffect(() => {
    setItems(posts);
  }, [posts]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px以上ドラッグしないとドラッグとして認識しない
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over?.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      // DBに順番を保存
      setIsUpdating(true);
      try {
        const result = await updatePostOrder(newItems.map((item) => item.id));
        if (!result.success) {
          // エラーの場合は元に戻す
          setItems(items);
          console.error('順番の更新に失敗:', result.message);
        }
      } catch (error) {
        // エラーの場合は元に戻す
        setItems(items);
        console.error('順番の更新エラー:', error);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  return (
    <div className="relative">
      {isUpdating && (
        <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
          <div className="bg-white px-4 py-2 rounded-lg shadow-lg">順番を更新中...</div>
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-5 gap-4">
            {items.map((post) => (
              <DraggablePostCard
                key={post.id}
                post={post}
                isSelectionMode={isSelectionMode}
                isSelected={selectedPosts.has(post.id)}
                onToggleSelection={() => onToggleSelection?.(post.id)}
                onPostClick={onPostClick}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
