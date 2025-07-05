import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/app/_lib/prisma';
import { StripeService } from '@/app/_services/StripeService';
import { Plan } from '@prisma/client';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
  }

  try {
    const event = StripeService.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutCompleted(session as unknown as Record<string, unknown>);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription as unknown as Record<string, unknown>);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription as unknown as Record<string, unknown>);
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }
}

async function handleCheckoutCompleted(session: Record<string, unknown>) {
  const customerId = typeof session.customer === 'string' ? session.customer : null;

  if (!customerId) return;

  // ユーザーを見つけてプランを更新
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  // BASICプランに変更
  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: Plan.BASIC,
    },
  });
}

async function handleSubscriptionUpdated(subscription: Record<string, unknown>) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : null;

  if (!customerId) return;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  // サブスクリプション状態に応じてプランを更新
  const status = typeof subscription.status === 'string' ? subscription.status : '';
  const isActive = status === 'active' || status === 'trialing';

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: isActive ? Plan.BASIC : Plan.FREE,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Record<string, unknown>) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : null;

  if (!customerId) return;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  // FREEプランにダウングレード
  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: Plan.FREE,
    },
  });
}

// 支払い成功・失敗はプラン変更に影響しないので削除
