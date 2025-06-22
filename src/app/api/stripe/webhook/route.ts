import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/app/_lib/prisma';
import { StripeService } from '@/app/_services/StripeService';
import { Plan, SubscriptionStatus } from '@prisma/client';

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

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await handlePaymentSucceeded(invoice as unknown as Record<string, unknown>);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handlePaymentFailed(invoice as unknown as Record<string, unknown>);
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
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;

  if (!customerId || !subscriptionId) return;

  // ユーザーを見つけてサブスクリプション情報を更新
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  // サブスクリプション情報を取得
  const subscription = await StripeService.getSubscription(subscriptionId);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: Plan.BASIC,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: mapStripeStatus(subscription.status),
      currentPeriodEnd: new Date(
        (subscription as unknown as { current_period_end: number }).current_period_end * 1000
      ),
    },
  });

  // 支払い記録を作成
  await prisma.payment.create({
    data: {
      userId: user.id,
      stripePaymentId:
        (typeof session.payment_intent === 'string' ? session.payment_intent : null) ||
        (typeof session.id === 'string' ? session.id : ''),
      amount: (typeof session.amount_total === 'number' ? session.amount_total : null) || 2980,
      currency: (typeof session.currency === 'string' ? session.currency : null) || 'jpy',
      status: 'succeeded',
      plan: Plan.BASIC,
    },
  });
}

async function handleSubscriptionUpdated(subscription: Record<string, unknown>) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : null;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: mapStripeStatus(
        typeof subscription.status === 'string' ? subscription.status : ''
      ),
      currentPeriodEnd: new Date(
        (typeof subscription.current_period_end === 'number'
          ? subscription.current_period_end
          : 0) * 1000
      ),
    },
  });
}

async function handleSubscriptionDeleted(subscription: Record<string, unknown>) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : null;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: Plan.FREE,
      subscriptionStatus: SubscriptionStatus.CANCELED,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
    },
  });
}

async function handlePaymentSucceeded(invoice: Record<string, unknown>) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : null;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) return;

  // 支払い記録を作成
  await prisma.payment.create({
    data: {
      userId: user.id,
      stripePaymentId: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : '',
      amount: typeof invoice.amount_paid === 'number' ? invoice.amount_paid : 0,
      currency: typeof invoice.currency === 'string' ? invoice.currency : 'jpy',
      status: 'succeeded',
      plan: Plan.BASIC,
    },
  });
}

async function handlePaymentFailed(invoice: Record<string, unknown>) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : null;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) return;

  // サブスクリプションステータスを更新
  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: SubscriptionStatus.PAST_DUE,
    },
  });
}

function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
      return SubscriptionStatus.ACTIVE;
    case 'canceled':
      return SubscriptionStatus.CANCELED;
    case 'past_due':
      return SubscriptionStatus.PAST_DUE;
    case 'unpaid':
      return SubscriptionStatus.UNPAID;
    case 'incomplete':
    case 'incomplete_expired':
      return SubscriptionStatus.INCOMPLETE;
    default:
      return SubscriptionStatus.INCOMPLETE;
  }
}
