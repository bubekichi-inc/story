'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/app/_components/ui/button';
import { Instagram, CheckCircle, AlertCircle, Unlink } from 'lucide-react';
import { toast } from 'sonner';

interface InstagramAccount {
  id: string;
  username: string;
  isConnected: boolean;
  expiresAt?: Date;
}

export default function AccountsPage() {
  const [instagramAccount, setInstagramAccount] = useState<InstagramAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    loadInstagramAccount();
    
    // URLパラメータをチェックして成功/エラーメッセージを表示
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (success) {
      toast.success('Instagramアカウントが正常に連携されました');
      // URLからパラメータを削除
      window.history.replaceState({}, '', '/accounts');
      loadInstagramAccount(); // 再読み込み
    } else if (error) {
      const errorMessages: Record<string, string> = {
        access_denied: 'Instagram連携がキャンセルされました',
        invalid_request: '無効なリクエストです',
        server_error: 'サーバーエラーが発生しました。もう一度お試しください',
      };
      toast.error(errorMessages[error] || 'Instagram連携に失敗しました');
      // URLからパラメータを削除
      window.history.replaceState({}, '', '/accounts');
    }
  }, []);

  const loadInstagramAccount = async () => {
    try {
      const response = await fetch('/api/user/instagram');
      if (response.ok) {
        const data = await response.json();
        setInstagramAccount(data);
      } else {
        setInstagramAccount(null);
      }
    } catch (error) {
      console.error('Instagram account load error:', error);
      setInstagramAccount(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstagramConnect = async () => {
    setIsConnecting(true);
    try {
      window.location.href = '/api/instagram/auth';
    } catch (error) {
      console.error('Instagram connect error:', error);
      toast.error('Instagram連携の開始に失敗しました');
      setIsConnecting(false);
    }
  };

  const handleInstagramDisconnect = async () => {
    if (!confirm('Instagramの連携を解除しますか？')) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/user/instagram', {
        method: 'DELETE',
      });

      if (response.ok) {
        setInstagramAccount(null);
        toast.success('Instagramの連携を解除しました');
      } else {
        throw new Error('Failed to disconnect Instagram');
      }
    } catch (error) {
      console.error('Instagram disconnect error:', error);
      toast.error('Instagram連携の解除に失敗しました');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">アカウント設定</h1>
          <p className="text-gray-600 mt-2">外部サービスとの連携を管理します</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">アカウント設定</h1>
        <p className="text-gray-600 mt-2">外部サービスとの連携を管理します</p>
      </div>

      <div className="space-y-6">
        {/* Instagram連携 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Instagram className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Instagram</h2>
              <p className="text-sm text-gray-600">ストーリーズへの自動投稿機能</p>
            </div>
          </div>

          {instagramAccount?.isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">連携済み</span>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">アカウント名:</span>
                    <span className="font-medium">@{instagramAccount.username}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">アカウントID:</span>
                    <span className="font-mono text-xs">{instagramAccount.id}</span>
                  </div>
                  {instagramAccount.expiresAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">トークン有効期限:</span>
                      <span className="text-gray-800">
                        {new Date(instagramAccount.expiresAt).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={handleInstagramDisconnect}
                disabled={isDisconnecting}
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
              >
                <Unlink className="w-4 h-4 mr-2" />
                {isDisconnecting ? '連携解除中...' : '連携を解除'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-500">
                <AlertCircle className="w-5 h-5" />
                <span>未連携</span>
              </div>
              
              <p className="text-sm text-gray-600">
                Instagramビジネスアカウントと連携して、ストーリーズへの自動投稿を有効にします。
                連携には以下の権限が必要です：
              </p>
              
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• プロフィール情報の読み取り</li>
                <li>• メディアの読み取り</li>
                <li>• ストーリーズへの投稿</li>
              </ul>

              <Button
                onClick={handleInstagramConnect}
                disabled={isConnecting}
                className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white"
              >
                <Instagram className="w-4 h-4 mr-2" />
                {isConnecting ? '連携中...' : 'Instagramと連携'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}