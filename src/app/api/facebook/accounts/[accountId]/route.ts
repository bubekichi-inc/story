import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
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
    const { accountId } = await params;

    if (!accessToken || !accountId) {
      return NextResponse.json(
        { error: 'Access token and account ID are required' },
        { status: 400 }
      );
    }

    // 1. Facebookページからpage access tokenを取得
    const pageResponse = await fetch(
      `https://graph.facebook.com/v18.0/${accountId}?fields=access_token&access_token=${accessToken}`
    );

    if (!pageResponse.ok) {
      throw new Error('Failed to get page access token');
    }

    const pageData = await pageResponse.json();
    const pageAccessToken = pageData.access_token;

    // 2. Instagram Business Accountを取得
    const igResponse = await fetch(
      `https://graph.facebook.com/v18.0/${accountId}?fields=instagram_business_account&access_token=${pageAccessToken}`
    );

    if (!igResponse.ok) {
      throw new Error('Failed to get Instagram business account');
    }

    const igData = await igResponse.json();

    if (!igData.instagram_business_account?.id) {
      return NextResponse.json({ error: 'Instagram business account not found' }, { status: 404 });
    }

    const instagramAccountId = igData.instagram_business_account.id;

    // 3. Instagram アカウント詳細情報を取得
    const igDetailResponse = await fetch(
      `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=username,name,profile_picture_url&access_token=${pageAccessToken}`
    );

    if (!igDetailResponse.ok) {
      throw new Error('Failed to get Instagram account details');
    }

    const igDetails = await igDetailResponse.json();

    return NextResponse.json({
      id: instagramAccountId,
      name: igDetails.name || '',
      username: igDetails.username || '',
      profilePictureUrl: igDetails.profile_picture_url || '',
      facebookAccountId: accountId,
      pageAccessToken: pageAccessToken,
    });
  } catch (error) {
    console.error('Instagram account fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
