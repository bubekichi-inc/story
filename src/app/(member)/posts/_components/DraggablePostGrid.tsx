'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
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
}

function DraggablePostCard({ post }: { post: Post }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: post.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const images = post.images.sort((a, b) => a.order - b.order);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative group cursor-grab active:cursor-grabbing"
    >
      {/* メイン画像 */}
      <div className="aspect-[9/16] relative overflow-hidden shadow-card">
        <Image
          src={images[0].imageUrl}
          alt={images[0].fileName}
          height={800}
          width={450}
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 20vw, 20vw"
        />

        {/* 複数枚アイコン */}
        {images.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5">
            <Copy className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function DraggablePostGrid({ posts }: DraggablePostGridProps) {
  const [items, setItems] = useState(posts);
  const [isUpdating, setIsUpdating] = useState(false);

  // propsが変更されたときにstateを更新
  useEffect(() => {
    setItems(posts);
  }, [posts]);

  const sensors = useSensors(
    useSensor(PointerSensor),
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
              <DraggablePostCard key={post.id} post={post} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
