import { NextRequest, NextResponse } from 'next/server';
import { retryFailedEntries } from '@/app/_services/ScheduleService';

export async function GET(request: NextRequest) {
  // Vercelのcronジョブからの呼び出しを確認
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await retryFailedEntries();
    return NextResponse.json({
      success: true,
      message: '失敗エントリーをリトライしました',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('失敗エントリーリトライエラー:', error);
    return NextResponse.json(
      { success: false, error: '失敗エントリーのリトライに失敗しました' },
      { status: 500 }
    );
  }
}
