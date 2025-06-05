'use client';

import { Textarea } from '@/app/_components/ui/textarea';

interface TextGenerationSectionProps {
  threadsText: string;
  xText: string;
  showThreadsText: boolean;
  showXText: boolean;
  isGeneratingThreads: boolean;
  isGeneratingX: boolean;
  onThreadsTextChange: (value: string) => void;
  onXTextChange: (value: string) => void;
  onShowThreadsTextChange: (show: boolean) => void;
  onShowXTextChange: (show: boolean) => void;
}

export default function TextGenerationSection({
  threadsText,
  xText,
  showThreadsText,
  showXText,
  isGeneratingThreads,
  isGeneratingX,
  onThreadsTextChange,
  onXTextChange,
  onShowThreadsTextChange,
  onShowXTextChange,
}: TextGenerationSectionProps) {
  return (
    <div className="flex-1 space-y-4">
      <div className="flex gap-4">
        {/* Threadsテキストエリア */}
        <div className="flex flex-col relative gap-2 w-full">
          <button
            onClick={() => onShowThreadsTextChange(!showThreadsText)}
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
            <span className="text-sm font-medium">Threadsに投稿</span>
          </button>
          <Textarea
            value={threadsText}
            onChange={(e) => onThreadsTextChange(e.target.value)}
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
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
            onClick={() => onShowXTextChange(!showXText)}
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
            <span className="text-sm font-medium">Xに投稿</span>
          </button>
          <Textarea
            value={xText}
            onChange={(e) => onXTextChange(e.target.value)}
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
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
  );
}
