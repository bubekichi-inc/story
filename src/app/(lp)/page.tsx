import { createClient } from '@/app/_lib/supabase/server';
import { redirect } from 'next/navigation';
import FeaturesSection from './_components/FeatureSection';
import Footer from './_components/Footer';
import HeroSection from './_components/HeloSection';
import Navbar from './_components/Navbar';

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
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <Footer />
    </main>
  );
}
