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

interface FacebookAccount {
  id: string;
  name: string;
}

interface InstagramAccountDetails {
  id: string;
  name: string;
  username: string;
  profilePictureUrl: string;
  facebookAccountId: string;
  pageAccessToken: string;
}

export default function AccountsPage() {
  const [instagramAccount, setInstagramAccount] = useState<InstagramAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // 1: ログインボタン, 2: FBページ選択, 3: IGアカウント確認
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fbAccounts, setFbAccounts] = useState<FacebookAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isAccountFetched, setIsAccountFetched] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [igAccount, setIgAccount] = useState<InstagramAccountDetails | null>(null);

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

    // URLのハッシュフラグメントからアクセストークンを取得
    const hash = window.location.hash.substring(1);
    const accessTokenMatch = hash.match(/access_token=([^&]*)/);

    if (accessTokenMatch) {
      const token = accessTokenMatch[1];
      handleGetAccounts(token);
      // ハッシュをクリア
      window.history.replaceState({}, '', window.location.pathname);
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

  /** FBアカウント一覧を取得 */
  const handleGetAccounts = async (accessToken: string) => {
    try {
      setIsLoading(true);
      setStep(2);
      setAccessToken(accessToken);

      const response = await fetch(`/api/facebook/accounts?accessToken=${accessToken}`);

      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }

      const data = await response.json();
      setFbAccounts(data.accounts);
      setIsAccountFetched(true);
    } catch (e) {
      toast.error('Facebookアカウントの取得に失敗しました');
      console.log(e);
      setStep(1);
    } finally {
      setIsLoading(false);
    }
  };

  /** FBページを選択し、IGアカウント情報を取得 */
  const handleSelectAccount = async (accountId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/facebook/accounts/${accountId}?accessToken=${accessToken}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get Instagram account');
      }

      const data = await response.json();
      setIgAccount(data);
      setSelectedAccountId(accountId);
      setStep(3);
    } catch (e) {
      toast.error('Instagramアカウントの取得に失敗しました');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  /** IGアカウントを選択し、連携を完了 */
  const handleConfirmAccount = async () => {
    if (!igAccount || !selectedAccountId) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/instagram/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken,
          accountId: selectedAccountId,
          instagramAccountId: igAccount.id,
          pageAccessToken: igAccount.pageAccessToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect Instagram');
      }

      toast.success('Instagramアカウントが連携されました');
      setStep(1);
      loadInstagramAccount();
    } catch (e) {
      toast.error('Instagram連携に失敗しました');
      console.error(e);
    } finally {
      setIsLoading(false);
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

          {/* ステップ2: Facebookページ選択 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="mb-5">
                連携するInstagramアカウントに紐づくFacebookページを選択してください
              </div>
              <div className="max-w-[600px] space-y-2">
                {fbAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="p-4 bg-gray-100 rounded-md cursor-pointer hover:bg-blue-100 duration-100"
                    onClick={() => handleSelectAccount(account.id)}
                  >
                    {account.name}
                  </div>
                ))}
                {isAccountFetched && fbAccounts.length === 0 && (
                  <div className="text-red-400 mb-4">
                    連携可能なアカウントがありません。Facebookページが作成され、Instagramビジネスアカウントと連携されていることを確認してください。
                  </div>
                )}
              </div>
              <Button onClick={() => setStep(1)} variant="outline" className="mt-4">
                戻る
              </Button>
            </div>
          )}

          {/* ステップ3: Instagramアカウント確認 */}
          {step === 3 && igAccount && (
            <div className="space-y-4">
              <div className="mb-4">こちらのInstagramアカウントと連携してよろしいですか？</div>
              <div className="p-4 bg-gray-50 rounded-lg inline-block mb-8">
                <div className="flex items-center">
                  <div className="mr-2">
                    {igAccount.profilePictureUrl && (
                      <img
                        src={igAccount.profilePictureUrl}
                        alt={igAccount.username}
                        className="rounded-full h-12 w-12 min-w-[48px]"
                      />
                    )}
                  </div>
                  <div>
                    <div className="line-clamp-1">{igAccount.name}</div>
                    <div className="text-xs text-gray-500">@{igAccount.username}</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleConfirmAccount}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white"
                >
                  {isLoading ? '連携中...' : 'OK'}
                </Button>
                <Button onClick={() => setStep(2)} variant="outline">
                  戻る
                </Button>
              </div>
            </div>
          )}

          {/* ステップ1: 初期状態 */}
          {step === 1 && (
            <>
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
                  </p>

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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
