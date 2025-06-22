'use client';

import { Card, CardContent } from '@/app/_components/ui/card';
import { Button } from '@/app/_components/ui/button';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Plan, SubscriptionStatus } from '@prisma/client';

interface PlanLimitWarningProps {
  plan: Plan;
  subscriptionStatus?: SubscriptionStatus | null;
}

export default function PlanLimitWarning({ plan, subscriptionStatus }: PlanLimitWarningProps) {
  const router = useRouter();

  // FREEプランまたはBASICプランでサブスクリプションが無効な場合に警告を表示
  const shouldShowWarning =
    plan === Plan.FREE || (plan === Plan.BASIC && subscriptionStatus !== SubscriptionStatus.ACTIVE);

  if (!shouldShowWarning) {
    return null;
  }

  const handleUpgrade = () => {
    router.push('/plan');
  };

  return (
    <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-yellow-600 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              投稿機能が利用できません
            </h3>
            <div className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
              {plan === Plan.FREE ? (
                <p>
                  現在FREEプランをご利用いただいています。投稿機能をご利用いただくには、BASICプランへのアップグレードが必要です。
                </p>
              ) : (
                <p>
                  サブスクリプションが無効です。投稿機能をご利用いただくには、有効なサブスクリプションが必要です。
                </p>
              )}
              <div className="bg-white/50 dark:bg-black/20 p-3 rounded-md">
                <p className="font-medium mb-1">BASICプランの特典:</p>
                <ul className="text-xs space-y-1">
                  <li>• 投稿機能無制限</li>
                  <li>• スケジュール投稿</li>
                  <li>• Instagram・X・Threads連携</li>
                  <li>• 画像アップロード</li>
                  <li>• AI文章生成</li>
                </ul>
              </div>
            </div>
            <Button onClick={handleUpgrade} className="mt-4" size="sm">
              <CreditCard className="w-4 h-4 mr-2" />
              プラン管理ページへ
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
