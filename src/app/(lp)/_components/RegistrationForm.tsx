'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

interface RegistrationFormProps {
  variant?: 'default' | 'modal';
  onSuccess?: () => void;
}

export default function RegistrationForm({ variant = 'default', onSuccess }: RegistrationFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setStatus('error');
      setMessage('有効なメールアドレスを入力してください');
      return;
    }

    setStatus('submitting');

    // APIコール（デモ用のタイムアウト）
    setTimeout(() => {
      setStatus('success');
      setMessage('ご登録ありがとうございます！アーリーアクセスの準備が整いましたらご連絡いたします。');
      setEmail('');
      if (onSuccess) {
        setTimeout(onSuccess, 1500); // 成功メッセージを少し表示してからコールバック実行
      }
    }, 1000);
  };

  const isModal = variant === 'modal';

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="relative">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="メールアドレスを入力"
          className={`w-full bg-white px-6 py-4 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-600 ${
            isModal
              ? 'text-gray-800 border border-gray-200'
              : 'text-gray-800'
          }`}
          disabled={status === 'submitting' || status === 'success'}
        />
        <button
          type="submit"
          disabled={status === 'submitting' || status === 'success'}
          className="absolute font-bold right-1 top-1 bottom-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full px-6 py-3 hover:opacity-90 transition-opacity disabled:opacity-70 flex items-center justify-center"
        >
          {status === 'submitting' ? (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <>
              <span className="mr-2">登録</span>
              <Send className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {status !== 'idle' && (
        <p className={`mt-4 text-sm ${
          status === 'error'
            ? (isModal ? 'text-red-500' : 'text-red-200')
            : (isModal ? 'text-green-600' : 'text-white')
        }`}>
          {message}
        </p>
      )}
    </form>
  );
}
