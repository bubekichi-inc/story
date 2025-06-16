import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // ユーザー認証チェック
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('accessToken');

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 });
    }

    // Facebook Graph APIでページ一覧を取得
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Facebook accounts');
    }

    const data = await response.json();

    return NextResponse.json({
      accounts:
        data.data?.map((account: { id: string; name: string }) => ({
          id: account.id,
          name: account.name,
        })) || [],
    });
  } catch (error) {
    console.error('Facebook accounts fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
