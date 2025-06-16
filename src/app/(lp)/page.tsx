import { createClient } from '@/app/_lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function Home() {
  // すでにログインしている場合はダッシュボードにリダイレクト
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/posts');
  }

  return (
    <main className="min-h-screen flex flex-col">
      メンテナンス中...
      <Link
        href="/login"
        className="fixed top-0 left-0 w-4 h-4 opacity-0 pointer-events-auto"
        aria-label="ログイン"
      />
      {/* <Navbar />
      <HeroSection />
      <FeaturesSection />
      <Footer /> */}
    </main>
  );
}
