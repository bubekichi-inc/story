'use client';

import { useState } from 'react';
import { Button } from '@/app/_components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/_components/ui/dialog';
import { Input } from '@/app/_components/ui/input';
import { Label } from '@/app/_components/ui/label';
import { signIn, signUp } from '@/app/_actions/auth';

type AuthMode = 'signin' | 'signup';

interface AuthDialogProps {
  children: React.ReactNode;
}

export function AuthDialog({ children }: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setMessage('');

    try {
      const result = mode === 'signin' ? await signIn(formData) : await signUp(formData);

      if (result.success) {
        setMessage(result.message);
        if (mode === 'signin') {
          setOpen(false);
        }
      } else {
        setMessage(result.message);
      }
    } catch {
      setMessage('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{mode === 'signin' ? 'ログイン' : 'アカウント作成'}</DialogTitle>
          <DialogDescription>
            {mode === 'signin'
              ? 'メールアドレスとパスワードでログインしてください'
              : '新しいアカウントを作成してください'}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input id="email" name="email" type="email" required placeholder="example@email.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="パスワード"
                minLength={6}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {message && (
            <div
              className={`text-sm ${
                message.includes('失敗') || message.includes('エラー')
                  ? 'text-red-600'
                  : 'text-green-600'
              }`}
            >
              {message}
            </div>
          )}

          <div className="space-y-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '処理中...' : mode === 'signin' ? 'ログイン' : 'アカウント作成'}
            </Button>

            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setMessage('');
                setShowPassword(false);
              }}
            >
              {mode === 'signin'
                ? 'アカウントをお持ちでない方はこちら'
                : 'すでにアカウントをお持ちの方はこちら'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
