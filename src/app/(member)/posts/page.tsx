import { createClient } from '@/app/_lib/supabase/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/app/_lib/prisma';
import { getUserSubscriptionInfo } from '@/app/_lib/subscription';
import PostsContent from './_components/PostsContent';

export default async function Posts() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/');
  }

  // ユーザーのサブスクリプション情報を取得
  const subscriptionInfo = await getUserSubscriptionInfo(user.id);

  // ユーザーの投稿を取得
  const posts = await prisma.post.findMany({
    where: { userId: user.id },
    include: {
      images: {
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { order: 'asc' },
  });

  return <PostsContent posts={posts} subscriptionInfo={subscriptionInfo} />;
}
