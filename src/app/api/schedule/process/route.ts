import { NextRequest, NextResponse } from 'next/server';
import { processScheduleEntries } from '@/app/_services/ScheduleService';

export async function GET(request: NextRequest) {
  // Vercelのcronジョブからの呼び出しを確認
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await processScheduleEntries();
    return NextResponse.json({
      success: true,
      message: 'スケジュールエントリーを処理しました',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('スケジュールエントリー処理エラー:', error);
    return NextResponse.json(
      { success: false, error: 'スケジュールエントリー処理に失敗しました' },
      { status: 500 }
    );
  }
}
