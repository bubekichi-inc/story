import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/supabase/server';
import { generateInstagramAuthUrl } from '@/app/_services/InstagramService';

export async function GET(request: NextRequest) {
  try {
    // ユーザー認証チェック
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { origin } = new URL(request.url);
    const redirectUri = `${origin}/api/instagram/callback`;
    const state = user.id; // ユーザーIDをstateパラメータとして使用

    const authUrl = generateInstagramAuthUrl(redirectUri, state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Instagram auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}