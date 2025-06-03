'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/app/_lib/supabase/server';
import { prisma } from '@/app/_lib/prisma';

type AuthResult = {
  success: boolean;
  message: string;
};

export async function signUp(formData: FormData): Promise<AuthResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return {
      success: false,
      message: 'メールアドレスとパスワードを入力してください',
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  // Supabaseユーザーが作成されたら、Prismaにもユーザー情報を保存
  if (data.user) {
    try {
      await prisma.user.create({
        data: {
          id: data.user.id,
          email: data.user.email!,
        },
      });
    } catch (error) {
      console.error('Failed to create user in database:', error);
      // Supabaseユーザーは作成されているので、エラーにはしない
    }
  }

  return {
    success: true,
    message: 'メールアドレスに確認メールを送信しました',
  };
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return {
      success: false,
      message: 'メールアドレスとパスワードを入力してください',
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      success: false,
      message: 'ログインに失敗しました',
    };
  }

  revalidatePath('/', 'layout');
  redirect('/posts');
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
