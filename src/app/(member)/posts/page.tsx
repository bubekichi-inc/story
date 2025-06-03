import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardContent from './_components/DashboardContent';

export default async function Posts() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/');
  }

  // ユーザーの投稿を取得
  const posts = await prisma.post.findMany({
    where: { userId: user.id },
    include: {
      images: {
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return <DashboardContent posts={posts} />;
}
