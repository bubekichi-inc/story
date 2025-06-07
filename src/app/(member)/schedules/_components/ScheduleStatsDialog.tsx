'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/_components/ui/dialog';
import { Button } from '@/app/_components/ui/button';
import { Badge } from '@/app/_components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/_components/ui/card';
import { Progress } from '@/app/_components/ui/progress';
import { RefreshCw, RotateCcw, Settings } from 'lucide-react';
import { getScheduleStatistics, resetScheduleCycle } from '../_actions/schedules';

type ScheduleStats = {
  totalPosts: number;
  postedPosts: number;
  remainingPosts: number;
  currentCycleProgress: number;
  resetCount: number;
  lastResetAt: Date | null;
  autoReset: boolean;
  postsUntilReset: number;
  isCompleted: boolean;
};

interface ScheduleStatsDialogProps {
  scheduleId: string | null;
  scheduleName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduleUpdate?: () => void;
}

export function ScheduleStatsDialog({
  scheduleId,
  scheduleName,
  open,
  onOpenChange,
  onScheduleUpdate,
}: ScheduleStatsDialogProps) {
  const [stats, setStats] = useState<ScheduleStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const loadStats = async () => {
    if (!scheduleId) return;

    setLoading(true);
    try {
      const result = await getScheduleStatistics(scheduleId);
      if (result.success && result.stats) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('統計情報取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!scheduleId) return;

    setResetLoading(true);
    try {
      const result = await resetScheduleCycle(scheduleId);
      if (result.success) {
        await loadStats(); // 統計情報を再読み込み
        onScheduleUpdate?.(); // 親コンポーネントの更新
      } else {
        alert(result.error || 'リセットに失敗しました');
      }
    } catch (error) {
      console.error('リセットエラー:', error);
      alert('リセットに失敗しました');
    } finally {
      setResetLoading(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'なし';
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  useEffect(() => {
    if (open && scheduleId) {
      loadStats();
    }
  }, [open, scheduleId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {scheduleName} - 統計情報
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* 自動循環設定 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  自動循環設定
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant={stats.autoReset ? 'default' : 'secondary'}>
                      {stats.autoReset ? '有効' : '無効'}
                    </Badge>
                    <p className="text-sm text-gray-500 mt-1">
                      {stats.autoReset
                        ? '全投稿完了後、自動的に新しいサイクルが開始されます'
                        : '全投稿完了後、投稿は停止します'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 現在のサイクル進捗 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">現在のサイクル進捗</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>進捗</span>
                      <span>{stats.currentCycleProgress}%</span>
                    </div>
                    <Progress value={stats.currentCycleProgress} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-blue-600 font-medium">総投稿数</div>
                      <div className="text-2xl font-bold text-blue-700">{stats.totalPosts}</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <div className="text-green-600 font-medium">投稿済み</div>
                      <div className="text-2xl font-bold text-green-700">{stats.postedPosts}</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded">
                      <div className="text-orange-600 font-medium">残り</div>
                      <div className="text-2xl font-bold text-orange-700">
                        {stats.remainingPosts}
                      </div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <div className="text-purple-600 font-medium">サイクル数</div>
                      <div className="text-2xl font-bold text-purple-700">
                        {stats.resetCount + 1}
                      </div>
                    </div>
                  </div>

                  {stats.isCompleted && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <div className="text-yellow-800 font-medium">🎉 現在のサイクル完了！</div>
                      <div className="text-yellow-700 text-sm">
                        {stats.autoReset
                          ? '次回投稿時に新しいサイクルが自動開始されます'
                          : '手動でリセットするか、自動循環を有効にしてください'}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 履歴情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">履歴情報</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">総リセット回数:</span>
                    <span className="font-medium">{stats.resetCount}回</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">最後のリセット:</span>
                    <span className="font-medium">{formatDate(stats.lastResetAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* アクション */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={resetLoading}
                className="flex items-center gap-2"
              >
                {resetLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                手動リセット
              </Button>

              <Button onClick={() => onOpenChange(false)}>閉じる</Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">統計情報を取得できませんでした</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
