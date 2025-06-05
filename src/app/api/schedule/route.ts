import { NextRequest, NextResponse } from 'next/server';
import {
  generateScheduleEntries,
  processScheduleEntries,
  retryFailedEntries,
} from '@/app/_services/ScheduleService';

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    switch (action) {
      case 'generate':
        await generateScheduleEntries();
        return NextResponse.json({
          success: true,
          message: 'スケジュールエントリーを生成しました',
        });

      case 'process':
        await processScheduleEntries();
        return NextResponse.json({
          success: true,
          message: 'スケジュールエントリーを処理しました',
        });

      case 'retry':
        await retryFailedEntries();
        return NextResponse.json({ success: true, message: '失敗エントリーをリトライしました' });

      case 'run-all':
        await generateScheduleEntries();
        await processScheduleEntries();
        await retryFailedEntries();
        return NextResponse.json({
          success: true,
          message: 'すべてのスケジュール処理を実行しました',
        });

      default:
        return NextResponse.json(
          { success: false, error: '無効なアクションです' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('スケジュールAPI エラー:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // ヘルスチェック用
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'スケジュールサービスは正常に動作しています (Vercel Cron使用)',
  });
}
