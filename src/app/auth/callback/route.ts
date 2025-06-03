import { createClient } from '@/app/_lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/_lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/posts';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // ユーザーがPrismaにも存在するかチェック、なければ作成
      try {
        await prisma.user.upsert({
          where: { id: data.user.id },
          update: { email: data.user.email! },
          create: {
            id: data.user.id,
            email: data.user.email!,
          },
        });
      } catch (error) {
        console.error('Failed to sync user to database:', error);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // エラーの場合はトップページにリダイレクト
  return NextResponse.redirect(`${origin}/`);
}
