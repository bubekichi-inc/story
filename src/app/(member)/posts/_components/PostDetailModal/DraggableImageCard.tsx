'use client';

import { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import Image from 'next/image';
import { useChat } from '@ai-sdk/react';
import { Textarea } from '@/app/_components/ui/textarea';
import type { PostImage } from './types';

interface DraggableImageCardProps {
  image: PostImage;
  onDelete: (imageId: string) => void;
  onTextUpdate: (imageId: string, threadsText?: string, xText?: string) => void;
}

export default function DraggableImageCard({
  image,
  onDelete,
  onTextUpdate,
}: DraggableImageCardProps) {
  const [showThreadsText, setShowThreadsText] = useState(!!image.threadsText);
  const [showXText, setShowXText] = useState(!!image.xText);
  const [threadsText, setThreadsText] = useState(image.threadsText || '');
  const [xText, setXText] = useState(image.xText || '');
  const [isGeneratingThreads, setIsGeneratingThreads] = useState(false);
  const [isGeneratingX, setIsGeneratingX] = useState(false);

  const threadsChat = useChat({
    api: '/api/chat',
    onFinish: (message) => {
      if (message.role === 'assistant' && message.content) {
        setThreadsText(message.content);
        setIsGeneratingThreads(false);
      }
    },
    onError: (error) => {
      console.error('Threads用テキスト生成エラー:', error);
      setIsGeneratingThreads(false);
      alert('Threads用テキストの生成に失敗しました');
    },
  });

  const xChat = useChat({
    api: '/api/chat',
    onFinish: (message) => {
      if (message.role === 'assistant' && message.content) {
        setXText(message.content);
        setIsGeneratingX(false);
      }
    },
    onError: (error) => {
      console.error('X用テキスト生成エラー:', error);
      setIsGeneratingX(false);
      alert('X用テキストの生成に失敗しました');
    },
  });

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

  const handleAnalyzeImage = async (platform: 'threads' | 'x') => {
    const prompt =
      '画像を文字起こししてください。改行は読みやすいように入れてください。文字起こしされたテキスト以外はレスポンスに含めないでください。```といった記号も含めないでください。';

    if (platform === 'threads') {
      setIsGeneratingThreads(true);
      setThreadsText(''); // テキストエリアをクリア
      await threadsChat.append({
        role: 'user',
        content: prompt,
        experimental_attachments: [
          {
            url: image.imageUrl,
            contentType: image.mimeType,
            name: image.fileName,
          },
        ],
      });
    } else {
      setIsGeneratingX(true);
      setXText(''); // テキストエリアをクリア
      await xChat.append({
        role: 'user',
        content: prompt,
        experimental_attachments: [
          {
            url: image.imageUrl,
            contentType: image.mimeType,
            name: image.fileName,
          },
        ],
      });
    }
  };

  const handleTextUpdate = async () => {
    const threads = showThreadsText ? threadsText : undefined;
    const x = showXText ? xText : undefined;
    await onTextUpdate(image.id, threads, x);
  };

  // チェックボックスの状態が変わったときの処理
  useEffect(() => {
    if (showThreadsText && !threadsText && !isGeneratingThreads) {
      handleAnalyzeImage('threads');
    } else if (!showThreadsText) {
      setThreadsText('');
      // チェックを外したときもテキストの更新を通知
      handleTextUpdate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showThreadsText]);

  useEffect(() => {
    if (showXText && !xText && !isGeneratingX) {
      handleAnalyzeImage('x');
    } else if (!showXText) {
      setXText('');
      // チェックを外したときもテキストの更新を通知
      handleTextUpdate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showXText]);

  // テキストが変更されたら自動保存（デバウンス）
  useEffect(() => {
    if (isGeneratingThreads || isGeneratingX) return;

    const timer = setTimeout(() => {
      if (showThreadsText || showXText) {
        handleTextUpdate();
      }
    }, 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadsText, xText]);

  // ストリーミング中のテキスト更新
  useEffect(() => {
    if (threadsChat.isLoading && threadsChat.messages.length > 0) {
      const lastMessage = threadsChat.messages[threadsChat.messages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.content) {
        setThreadsText(lastMessage.content);
        if (lastMessage.content.length > 0) {
          setIsGeneratingThreads(false);
        }
      }
    }
  }, [threadsChat.messages, threadsChat.isLoading]);

  useEffect(() => {
    if (xChat.isLoading && xChat.messages.length > 0) {
      const lastMessage = xChat.messages[xChat.messages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.content) {
        setXText(lastMessage.content);
        if (lastMessage.content.length > 0) {
          setIsGeneratingX(false);
        }
      }
    }
  }, [xChat.messages, xChat.isLoading]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex gap-4 p-4 border rounded-lg bg-white items-start"
    >
      {/* 左側：画像 */}
      <div className="relative group w-[320px] aspect-[9/16] bg-black overflow-hidden flex-shrink-0">
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

        <Image
          src={image.imageUrl}
          alt={image.fileName}
          fill
          className="object-contain"
          sizes="192px"
        />
      </div>

      {/* 右側：テキスト生成セクション */}
      <div className="flex-1 space-y-4">
        <div className="flex gap-4">
          {/* Threadsテキストエリア */}
          <div className="flex flex-col relative gap-2 w-full">
            <button
              onClick={() => setShowThreadsText(!showThreadsText)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                showThreadsText
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 border-blue-500 text-white shadow-lg'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  showThreadsText ? 'border-white bg-white' : 'border-gray-400 bg-transparent'
                }`}
              >
                {showThreadsText && (
                  <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium">Threadsに転用</span>
            </button>
            <Textarea
              value={threadsText}
              onChange={(e) => setThreadsText(e.target.value)}
              rows={16}
              placeholder="Threads用のテキストを入力..."
              className={`min-h-20 transition-all duration-300 ${
                !showThreadsText
                  ? 'bg-gray-100 text-gray-400'
                  : isGeneratingThreads && !threadsText
                    ? 'bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 bg-[length:200%_100%] animate-pulse border-blue-300'
                    : ''
              }`}
              disabled={!showThreadsText || (isGeneratingThreads && !threadsText)}
              style={
                showThreadsText && isGeneratingThreads && !threadsText
                  ? {
                      animation: 'aiGradient 2s ease-in-out infinite',
                      backgroundImage: 'linear-gradient(45deg, #f0f9ff, #e0e7ff, #f3e8ff, #f0f9ff)',
                      backgroundSize: '300% 300%',
                    }
                  : {}
              }
            />
            {showThreadsText && isGeneratingThreads && !threadsText && (
              <div className="absolute top-12 left-0 right-0 bottom-0 flex items-center justify-center pointer-events-none">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                </div>
              </div>
            )}
          </div>

          {/* Xテキストエリア */}
          <div className="flex flex-col relative gap-2 w-full">
            <button
              onClick={() => setShowXText(!showXText)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                showXText
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 border-blue-500 text-white shadow-lg'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  showXText ? 'border-white bg-white' : 'border-gray-400 bg-transparent'
                }`}
              >
                {showXText && (
                  <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium">Xに転用</span>
            </button>
            <Textarea
              value={xText}
              onChange={(e) => setXText(e.target.value)}
              placeholder="X用のテキストを入力..."
              className={`min-h-20 transition-all duration-300 ${
                !showXText
                  ? 'bg-gray-100 text-gray-400'
                  : isGeneratingX && !xText
                    ? 'bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 bg-[length:200%_100%] animate-pulse border-blue-300'
                    : ''
              }`}
              disabled={!showXText || (isGeneratingX && !xText)}
              style={
                showXText && isGeneratingX && !xText
                  ? {
                      animation: 'aiGradient 2s ease-in-out infinite',
                      backgroundImage: 'linear-gradient(45deg, #f0f9ff, #e0e7ff, #f3e8ff, #f0f9ff)',
                      backgroundSize: '300% 300%',
                    }
                  : {}
              }
            />
            {showXText && isGeneratingX && !xText && (
              <div className="absolute top-12 left-0 right-0 bottom-0 flex items-center justify-center pointer-events-none">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
