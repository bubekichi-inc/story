'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/_components/ui/card';
import { Button } from '@/app/_components/ui/button';
import { Badge } from '@/app/_components/ui/badge';
import { Play, Pause, Settings, Trash2 } from 'lucide-react';
import { getSchedules, toggleScheduleActive } from '../_actions/schedules';
import { EditScheduleDialog } from './EditScheduleDialog';
import { DeleteScheduleDialog } from './DeleteScheduleDialog';
import {
  Schedule,
  ScheduleEntry,
  Post,
  PostImage,
  PostingStrategy,
  SchedulePost,
} from '@prisma/client';

type ScheduleWithRelations = Schedule & {
  entries: (ScheduleEntry & {
    post: Post & {
      images: PostImage[];
    };
  })[];
  selectedPosts: (SchedulePost & {
    post: Post & {
      images: PostImage[];
    };
  })[];
};

export function ScheduleList() {
  const [schedules, setSchedules] = useState<ScheduleWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [editSchedule, setEditSchedule] = useState<ScheduleWithRelations | null>(null);
  const [deleteSchedule, setDeleteSchedule] = useState<{ id: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const data = await getSchedules();
      setSchedules(data);
    } catch (error) {
      console.error('スケジュール取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (scheduleId: string) => {
    setActionLoading(scheduleId);
    try {
      const result = await toggleScheduleActive(scheduleId);
      if (result.success) {
        await loadSchedules(); // データを再読み込み
      } else {
        alert(result.error || '切り替えに失敗しました');
      }
    } catch (error) {
      console.error('切り替えエラー:', error);
      alert('切り替えに失敗しました');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const getStrategyLabel = (strategy: PostingStrategy) => {
    switch (strategy) {
      case PostingStrategy.RANDOM:
        return 'ランダム';
      case PostingStrategy.NEWEST_FIRST:
        return '新しい順';
      case PostingStrategy.OLDEST_FIRST:
        return '古い順';
      default:
        return '不明';
    }
  };

  const parseRRule = (rrule: string | null) => {
    if (!rrule) return '設定なし';

    try {
      // 10分ごと
      if (rrule.includes('FREQ=MINUTELY') && rrule.includes('INTERVAL=10')) {
        return '10分ごと';
      }
      // 毎時
      if (rrule.includes('FREQ=HOURLY')) {
        const minuteMatch = rrule.match(/BYMINUTE=(\d+)/);
        const minute = minuteMatch ? minuteMatch[1] : '0';
        return `毎時 ${minute}分`;
      }
      // 毎日
      if (rrule.includes('FREQ=DAILY')) {
        const hourMatch = rrule.match(/BYHOUR=(\d+)/);
        const minuteMatch = rrule.match(/BYMINUTE=(\d+)/);
        const hour = hourMatch ? hourMatch[1] : '不明';
        const minute = minuteMatch ? minuteMatch[1] : '0';
        return `毎日 ${hour}:${minute.padStart(2, '0')}`;
      }
      // 毎週
      if (rrule.includes('FREQ=WEEKLY')) {
        const dayMatch = rrule.match(/BYDAY=(\w+)/);
        const hourMatch = rrule.match(/BYHOUR=(\d+)/);
        const minuteMatch = rrule.match(/BYMINUTE=(\d+)/);
        const dayNames: { [key: string]: string } = {
          SU: '日',
          MO: '月',
          TU: '火',
          WE: '水',
          TH: '木',
          FR: '金',
          SA: '土',
        };
        const day = dayMatch ? dayNames[dayMatch[1]] || '不明' : '不明';
        const hour = hourMatch ? hourMatch[1] : '不明';
        const minute = minuteMatch ? minuteMatch[1] : '0';
        return `毎週${day}曜日 ${hour}:${minute.padStart(2, '0')}`;
      }
      return rrule;
    } catch {
      return '設定エラー';
    }
  };

  const formatNextRun = (nextRun: Date | null) => {
    if (!nextRun) return '実行予定なし';

    return new Intl.DateTimeFormat('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(nextRun));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <div className="text-gray-500">読み込み中...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="text-gray-500 mb-4">スケジュールがありません</div>
            <p className="text-sm text-gray-400 text-center">
              新しいスケジュールを作成して、自動投稿を設定しましょう
            </p>
          </CardContent>
        </Card>
      ) : (
        schedules.map((schedule) => (
          <Card key={schedule.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{schedule.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant={schedule.isActive ? 'default' : 'secondary'}>
                    {schedule.isActive ? '有効' : '無効'}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => setEditSchedule(schedule)}>
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={schedule.isActive ? '' : 'text-green-600'}
                    onClick={() => handleToggleActive(schedule.id)}
                    disabled={actionLoading === schedule.id}
                  >
                    {actionLoading === schedule.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : schedule.isActive ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    onClick={() => setDeleteSchedule({ id: schedule.id, name: schedule.name })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">設定詳細</h4>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-gray-500">戦略:</span>
                      <span className="ml-2">{getStrategyLabel(schedule.strategy)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">頻度:</span>
                      <span className="ml-2">{parseRRule(schedule.rrule)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">次回実行:</span>
                      <span className="ml-2">{formatNextRun(schedule.nextRun)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">
                    最近の投稿 ({schedule.entries.length}件)
                  </h4>
                  {schedule.entries.length === 0 ? (
                    <div className="text-sm text-gray-500">投稿履歴なし</div>
                  ) : (
                    <div className="space-y-2">
                      {schedule.entries.slice(0, 3).map((entry) => (
                        <div key={entry.id} className="flex items-center space-x-2">
                          {entry.post.images.length > 0 && (
                            <Image
                              src={entry.post.images[0].imageUrl}
                              alt="投稿画像"
                              width={32}
                              height={32}
                              className="object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-500">
                              {new Intl.DateTimeFormat('ja-JP', {
                                month: 'numeric',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }).format(new Date(entry.scheduledAt))}
                            </div>
                            <div className="text-sm truncate">{entry.post.storyText || '投稿'}</div>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              entry.status === 'POSTED'
                                ? 'text-green-600'
                                : entry.status === 'FAILED'
                                  ? 'text-red-600'
                                  : entry.status === 'CANCELED'
                                    ? 'text-gray-600'
                                    : 'text-yellow-600'
                            }
                          >
                            {entry.status === 'POSTED'
                              ? '完了'
                              : entry.status === 'FAILED'
                                ? '失敗'
                                : entry.status === 'CANCELED'
                                  ? 'キャンセル'
                                  : '待機中'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">統計</h4>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-gray-500">総投稿数:</span>
                      <span className="ml-2">{schedule.entries.length}件</span>
                    </div>
                    <div>
                      <span className="text-gray-500">成功:</span>
                      <span className="ml-2 text-green-600">
                        {schedule.entries.filter((e) => e.status === 'POSTED').length}件
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">失敗:</span>
                      <span className="ml-2 text-red-600">
                        {schedule.entries.filter((e) => e.status === 'FAILED').length}件
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* 編集ダイアログ */}
      <EditScheduleDialog
        schedule={editSchedule}
        open={!!editSchedule}
        onOpenChange={(open) => !open && setEditSchedule(null)}
        onSuccess={loadSchedules}
      />

      {/* 削除確認ダイアログ */}
      <DeleteScheduleDialog
        schedule={deleteSchedule}
        open={!!deleteSchedule}
        onOpenChange={(open) => !open && setDeleteSchedule(null)}
        onSuccess={loadSchedules}
      />
    </div>
  );
}
