import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma } from '@/app/_lib/prisma';
import { StripeService } from '@/app/_services/StripeService';

export async function POST(request: NextRequest) {
  try {
    const { plan } = await request.json();

    if (plan !== 'BASIC') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // ユーザー認証確認
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Stripe顧客が存在しない場合は作成
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await StripeService.createCustomer(user.email);
      customerId = customer.id;

      // データベースに顧客IDを保存
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // チェックアウトセッションを作成
    const session = await StripeService.createCheckoutSession({
      customerId,
      customerEmail: user.email,
      plan: 'BASIC',
      successUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/plan?success=true`,
      cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/plan?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
