import { Plan, SubscriptionStatus } from '@prisma/client';

export interface PlanLimits {
  canCreatePosts: boolean;
  maxPosts: number | null; // null = unlimited
  features: string[];
}

export const PLAN_CONFIG: Record<Plan, PlanLimits> = {
  [Plan.FREE]: {
    canCreatePosts: false,
    maxPosts: 0,
    features: ['アカウント連携', 'スケジュール作成（投稿不可）', 'プレビュー機能'],
  },
  [Plan.BASIC]: {
    canCreatePosts: true,
    maxPosts: null, // unlimited
    features: [
      '投稿機能無制限',
      'スケジュール投稿',
      'Instagram・X・Threads連携',
      '画像アップロード',
      'AI文章生成',
    ],
  },
};

export function getUserPlanLimits(plan: Plan): PlanLimits {
  return PLAN_CONFIG[plan];
}

export function canUserCreatePosts(
  plan: Plan,
  subscriptionStatus?: SubscriptionStatus | null
): boolean {
  if (plan === Plan.FREE) {
    return false;
  }

  if (plan === Plan.BASIC) {
    // BASICプランの場合、サブスクリプションがアクティブである必要がある
    return subscriptionStatus === SubscriptionStatus.ACTIVE;
  }

  return false;
}

export function isPlanActive(plan: Plan, subscriptionStatus?: SubscriptionStatus | null): boolean {
  if (plan === Plan.FREE) {
    return true; // FREEプランは常にアクティブ
  }

  return subscriptionStatus === SubscriptionStatus.ACTIVE;
}

export function getPlanDisplayName(plan: Plan): string {
  switch (plan) {
    case Plan.FREE:
      return 'FREEプラン';
    case Plan.BASIC:
      return 'BASICプラン';
    default:
      return 'Unknown Plan';
  }
}

export function getPlanPrice(plan: Plan): number {
  switch (plan) {
    case Plan.FREE:
      return 0;
    case Plan.BASIC:
      return 2980;
    default:
      return 0;
  }
}
