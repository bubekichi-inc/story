'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/_components/ui/card';
import { Button } from '@/app/_components/ui/button';
import { ChevronLeft, ChevronRight, Clock, Image } from 'lucide-react';
import { getScheduleEntriesForCalendar } from '../_actions/schedules';
import { ScheduleEntry, Post, PostImage, Schedule, ScheduleStatus } from '@prisma/client';

type ScheduleEntryWithRelations = ScheduleEntry & {
  post: Post & {
    images: PostImage[];
  };
  schedule: Schedule | null;
};

export function ScheduleCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState<ScheduleEntryWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  // 月の最初と最後の日を取得
  const getMonthRange = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  };

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getMonthRange(currentDate);
      const data = await getScheduleEntriesForCalendar(start, end);
      setEntries(data);
    } catch (error) {
      console.error('エントリー取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    loadEntries();
  }, [currentDate, loadEntries]);

  // カレンダーの日付配列を生成
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];

    // 前月の日付を埋める
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // 今月の日付
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({ date, isCurrentMonth: true });
    }

    // 次月の日付を埋める（6週間表示にする）
    const remainingCells = 42 - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(year, month + 1, day);
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  };

  // 特定の日のエントリーを取得
  const getEntriesForDate = (date: Date) => {
    return entries.filter((entry) => {
      const entryDate = new Date(entry.scheduledAt);
      return (
        entryDate.getDate() === date.getDate() &&
        entryDate.getMonth() === date.getMonth() &&
        entryDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusColor = (status: ScheduleStatus) => {
    switch (status) {
      case ScheduleStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case ScheduleStatus.POSTED:
        return 'bg-green-100 text-green-800';
      case ScheduleStatus.FAILED:
        return 'bg-red-100 text-red-800';
      case ScheduleStatus.CANCELED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calendarDays = generateCalendarDays();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>投稿スケジュール</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[120px] text-center">
              {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
            </span>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* 曜日ヘッダー */}
            {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
              <div
                key={day}
                className={`p-2 text-center text-sm font-medium ${
                  index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
                }`}
              >
                {day}
              </div>
            ))}

            {/* カレンダーの日付 */}
            {calendarDays.map((dayInfo, index) => {
              const dayEntries = getEntriesForDate(dayInfo.date);
              const isToday = dayInfo.date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={index}
                  className={`min-h-[100px] p-1 border border-gray-200 ${
                    !dayInfo.isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                  } ${isToday ? 'bg-blue-50 border-blue-300' : ''}`}
                >
                  <div
                    className={`text-sm mb-1 ${
                      !dayInfo.isCurrentMonth ? 'text-gray-400' : 'text-gray-700'
                    } ${isToday ? 'font-bold text-blue-600' : ''}`}
                  >
                    {dayInfo.date.getDate()}
                  </div>

                  <div className="space-y-1">
                    {dayEntries.slice(0, 3).map((entry) => (
                      <div
                        key={entry.id}
                        className={`text-xs p-1 rounded ${getStatusColor(entry.status)}`}
                        title={`${formatTime(new Date(entry.scheduledAt))} - ${entry.post.storyText || '投稿'}`}
                      >
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(new Date(entry.scheduledAt))}</span>
                        </div>
                        {entry.post.images.length > 0 && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Image className="h-3 w-3" />
                            <span className="truncate">{entry.post.storyText || '投稿'}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {dayEntries.length > 3 && (
                      <div className="text-xs text-gray-500 p-1">+{dayEntries.length - 3}件</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
