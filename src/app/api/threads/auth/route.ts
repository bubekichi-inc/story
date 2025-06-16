import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/auth?error=unauthorized', request.url));
    }

    const threadsAppId = process.env.FACEBOOK_THREADS_APP_ID;
    if (!threadsAppId) {
      console.error('FACEBOOK_THREADS_APP_ID is not configured');
      return NextResponse.redirect(new URL('/accounts?error=server_error', request.url));
    }

    // 開発環境でもHTTPS URLを使用する必要がある
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? new URL(request.url).origin
      : process.env.NEXTAUTH_URL || 'https://localhost:3000';
    
    const redirectUri = `${baseUrl}/api/threads/callback`;
    const scope = 'threads_basic,threads_content_publish';
    const state = user.id; // CSRF protection

    const authUrl = new URL('https://threads.net/oauth/authorize');
    authUrl.searchParams.set('client_id', threadsAppId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);

    console.log('Redirecting to Threads auth URL:', authUrl.toString());
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Threads auth error:', error);
    return NextResponse.redirect(new URL('/accounts?error=server_error', request.url));
  }
}
