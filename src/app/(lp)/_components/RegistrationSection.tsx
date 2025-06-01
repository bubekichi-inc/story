'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

export default function RegistrationSection() {
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
    }, 1000);
  };

  return (
    <section id="register" className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-3xl overflow-hidden shadow-xl">
          <div className="px-6 py-12 md:p-12 lg:p-16">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                アーリーアクセスに登録
              </h2>
              <p className="text-xl text-white/90 mb-8 md:mb-10">
                StoriesAIがソーシャルメディア運用をどのように効率化するか、いち早く体験してください。
              </p>

              <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="メールアドレスを入力"
                    className="w-full px-6 py-4 rounded-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    disabled={status === 'submitting' || status === 'success'}
                  />
                  <button
                    type="submit"
                    disabled={status === 'submitting' || status === 'success'}
                    className="absolute right-1 top-1 bottom-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full px-6 py-3 hover:opacity-90 transition-opacity disabled:opacity-70 flex items-center justify-center"
                  >
                    {status === 'submitting' ? (
                      <svg className="animate-spin h-5 w-5\" xmlns="http://www.w3.org/2000/svg\" fill="none\" viewBox="0 0 24 24">
                        <circle className="opacity-25\" cx="12\" cy="12\" r="10\" stroke="currentColor\" strokeWidth="4"></circle>
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
                  <p className={`mt-4 text-sm ${status === 'error' ? 'text-red-200' : 'text-white'}`}>
                    {message}
                  </p>
                )}
              </form>

              <p className="mt-6 text-sm text-white/80">
                登録は無料です。製品アップデートについてのみご連絡いたします。
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
