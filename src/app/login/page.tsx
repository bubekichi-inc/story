'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from '@/app/_actions/auth';
import { Card } from '@/app/_components/ui/card';
import { Button } from '@/app/_components/ui/button';
import { Input } from '@/app/_components/ui/input';
import { Label } from '@/app/_components/ui/label';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setMessage('');

    try {
      const result = await signIn(formData);
      
      if (!result.success) {
        setMessage(result.message);
      }
    } catch {
      setMessage('ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">ログイン</h1>
          <p className="text-gray-600 mt-2">StoryCastAIにログインして開始</p>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="your-email@example.com"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="パスワードを入力"
              className="mt-1"
            />
          </div>

          {message && (
            <div className="text-sm text-red-600 text-center">
              {message}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            アカウントをお持ちでない方は{' '}
            <Link href="/" className="text-blue-600 hover:underline">
              こちらから登録
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}