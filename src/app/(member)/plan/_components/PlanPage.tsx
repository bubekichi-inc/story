'use client';

import { useState } from 'react';
import { Button } from '@/app/_components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/app/_components/ui/card';
import { Badge } from '@/app/_components/ui/badge';
import { Check, CreditCard, Settings } from 'lucide-react';
import { Plan } from '@prisma/client';
import { PLAN_CONFIG, getPlanDisplayName, getPlanPrice } from '@/app/_lib/plans';

interface UserSubscriptionInfo {
  plan: Plan;
  isActive: boolean;
  currentPeriodEnd?: Date;
  subscriptionStatus?: string;
}

interface PlanPageProps {
  subscriptionInfo: UserSubscriptionInfo;
}

export default function PlanPage({ subscriptionInfo }: PlanPageProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async () => {
    try {
      setLoading('BASIC');

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: 'BASIC',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('エラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading('manage');

      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating portal session:', error);
      alert('エラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(null);
    }
  };

  const isCurrentPlan = (plan: Plan) => subscriptionInfo.plan === plan;
  const isBasicActive = subscriptionInfo.plan === Plan.BASIC && subscriptionInfo.isActive;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">プラン管理</h1>
        <p className="text-muted-foreground">
          現在のプラン:{' '}
          <span className="font-semibold">{getPlanDisplayName(subscriptionInfo.plan)}</span>
        </p>
        {subscriptionInfo.currentPeriodEnd && (
          <p className="text-sm text-muted-foreground mt-2">
            次回更新日: {new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString('ja-JP')}
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* FREEプラン */}
        <Card className={`relative ${isCurrentPlan(Plan.FREE) ? 'ring-2 ring-primary' : ''}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>FREEプラン</CardTitle>
              {isCurrentPlan(Plan.FREE) && <Badge variant="default">現在のプラン</Badge>}
            </div>
            <CardDescription>
              <span className="text-2xl font-bold">¥0</span>
              <span className="text-muted-foreground"> / 月</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {PLAN_CONFIG[Plan.FREE].features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ FREEプランでは投稿機能はご利用いただけません
              </p>
            </div>
          </CardContent>
          <CardFooter>
            {isCurrentPlan(Plan.FREE) ? (
              <Button className="w-full" disabled>
                現在のプラン
              </Button>
            ) : (
              <Button variant="outline" className="w-full" disabled>
                ダウングレード（サポートにお問い合わせください）
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* BASICプラン */}
        <Card className={`relative ${isCurrentPlan(Plan.BASIC) ? 'ring-2 ring-primary' : ''}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>BASICプラン</CardTitle>
              {isCurrentPlan(Plan.BASIC) && <Badge variant="default">現在のプラン</Badge>}
            </div>
            <CardDescription>
              <span className="text-2xl font-bold">
                ¥{getPlanPrice(Plan.BASIC).toLocaleString()}
              </span>
              <span className="text-muted-foreground"> / 月</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {PLAN_CONFIG[Plan.BASIC].features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            {isCurrentPlan(Plan.BASIC) ? (
              <Button
                className="w-full"
                variant="outline"
                onClick={handleManageSubscription}
                disabled={loading === 'manage'}
              >
                <Settings className="w-4 h-4 mr-2" />
                {loading === 'manage' ? '処理中...' : 'サブスクリプション管理'}
              </Button>
            ) : (
              <Button className="w-full" onClick={handleUpgrade} disabled={loading === 'BASIC'}>
                <CreditCard className="w-4 h-4 mr-2" />
                {loading === 'BASIC' ? '処理中...' : 'BASICプランにアップグレード'}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* サブスクリプション状態の詳細 */}
      {subscriptionInfo.plan === Plan.BASIC && (
        <Card>
          <CardHeader>
            <CardTitle>サブスクリプション詳細</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">ステータス</p>
                <p className="text-lg font-semibold">
                  {subscriptionInfo.isActive ? (
                    <span className="text-green-600">アクティブ</span>
                  ) : subscriptionInfo.subscriptionStatus === 'canceled' ? (
                    <span className="text-red-600">キャンセル済み</span>
                  ) : subscriptionInfo.subscriptionStatus === 'past_due' ? (
                    <span className="text-yellow-600">支払い遅延</span>
                  ) : (
                    <span className="text-gray-600">不明</span>
                  )}
                </p>
              </div>

              {subscriptionInfo.currentPeriodEnd && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">次回更新日</p>
                  <p className="text-lg font-semibold">
                    {new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground">月額料金</p>
                <p className="text-lg font-semibold">
                  ¥{getPlanPrice(Plan.BASIC).toLocaleString()}
                </p>
              </div>
            </div>

            {!isBasicActive && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
                <p className="text-sm text-red-800 dark:text-red-200">
                  サブスクリプションが無効です。投稿機能をご利用いただくには、有効なサブスクリプションが必要です。
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
