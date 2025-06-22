import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/app/_lib/prisma';
import PlanPage from './_components/PlanPage';

export default async function Plan() {
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
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      email: true,
      plan: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
      stripeCustomerId: true,
    },
  });

  if (!user) {
    redirect('/login');
  }

  return <PlanPage user={user} />;
}
