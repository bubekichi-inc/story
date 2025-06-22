import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma } from '@/app/_lib/prisma';
import { StripeService } from '@/app/_services/StripeService';

export async function POST() {
  try {
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
        stripeCustomerId: true,
      },
    });

    if (!user || !user.stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
    }

    // カスタマーポータルセッションを作成
    const session = await StripeService.createPortalSession({
      customerId: user.stripeCustomerId,
      returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/plan`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
