import { StripeService } from '@/app/_services/StripeService';
import { prisma } from '@/app/_lib/prisma';
import { Plan } from '@prisma/client';
import type Stripe from 'stripe';

export interface UserSubscriptionInfo {
  plan: Plan;
  isActive: boolean;
  currentPeriodEnd?: Date;
  subscriptionStatus?: string;
}

export async function getUserSubscriptionInfo(userId: string): Promise<UserSubscriptionInfo> {
  // ユーザーの基本情報を取得
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      stripeCustomerId: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // FREEプランの場合は、Stripeを確認する必要なし
  if (user.plan === Plan.FREE || !user.stripeCustomerId) {
    return {
      plan: Plan.FREE,
      isActive: true, // FREEプランは常にアクティブ
    };
  }

  try {
    // Stripeから最新のサブスクリプション情報を取得
    const subscriptions = await StripeService.listSubscriptions(user.stripeCustomerId);

    // アクティブなサブスクリプションを探す
    const activeSubscription = subscriptions.data.find(
      (sub: Stripe.Subscription) => sub.status === 'active' || sub.status === 'trialing'
    );

    if (activeSubscription) {
      const currentPeriodEnd =
        'current_period_end' in activeSubscription
          ? new Date(
              (activeSubscription as Stripe.Subscription & { current_period_end: number })
                .current_period_end * 1000
            )
          : undefined;

      return {
        plan: Plan.BASIC,
        isActive: true,
        currentPeriodEnd,
        subscriptionStatus: activeSubscription.status,
      };
    }

    // アクティブなサブスクリプションがない場合はFREEプランにダウングレード
    if (user.plan === Plan.BASIC) {
      await prisma.user.update({
        where: { id: userId },
        data: { plan: Plan.FREE },
      });
    }

    return {
      plan: Plan.FREE,
      isActive: true,
    };
  } catch (error) {
    console.error('Error fetching subscription info from Stripe:', error);

    // Stripeエラーの場合、DBの情報をそのまま使用
    return {
      plan: user.plan,
      isActive: false, // エラー時は安全のため非アクティブとみなす
    };
  }
}

// プラン制限チェック関数（更新版）
export function canUserCreatePosts(subscriptionInfo: UserSubscriptionInfo): boolean {
  return subscriptionInfo.plan === Plan.BASIC && subscriptionInfo.isActive;
}
