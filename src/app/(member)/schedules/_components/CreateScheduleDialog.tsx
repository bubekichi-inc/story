'use client';

import { useState } from 'react';
import { Button } from '@/app/_components/ui/button';
import { Input } from '@/app/_components/ui/input';
import { Label } from '@/app/_components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/_components/ui/dialog';
import { PostingStrategy } from '@prisma/client';
import { createSchedule } from '../_actions/schedules';

interface CreateScheduleDialogProps {
  children: React.ReactNode;
}

export function CreateScheduleDialog({ children }: CreateScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    strategy: PostingStrategy;
    frequency: string;
    hour: number;
    weekday: number;
  }>({
    name: '',
    strategy: PostingStrategy.RANDOM,
    frequency: 'every10min',
    hour: 9,
    weekday: 1, // 月曜日
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // RRuleを生成
      let rruleString = '';
      if (formData.frequency === 'every10min') {
        rruleString = `RRULE:FREQ=MINUTELY;INTERVAL=10`;
      } else if (formData.frequency === 'hourly') {
        rruleString = `RRULE:FREQ=HOURLY`;
      } else if (formData.frequency === 'daily') {
        rruleString = `RRULE:FREQ=DAILY;BYHOUR=${formData.hour}`;
      } else if (formData.frequency === 'weekly') {
        rruleString = `RRULE:FREQ=WEEKLY;BYDAY=${['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][formData.weekday]};BYHOUR=${formData.hour}`;
      }

      const result = await createSchedule({
        name: formData.name,
        strategy: formData.strategy,
        rrule: rruleString,
      });

      if (result.success) {
        setOpen(false);
        setFormData({
          name: '',
          strategy: PostingStrategy.RANDOM,
          frequency: 'every10min',
          hour: 9,
          weekday: 1,
        });
      }
    } catch (error) {
      console.error('スケジュール作成エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>新しいスケジュールを作成</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">スケジュール名</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例: 朝9時ランダム投稿"
              required
            />
          </div>

          <div>
            <Label htmlFor="strategy">投稿戦略</Label>
            <select
              id="strategy"
              value={formData.strategy}
              onChange={(e) =>
                setFormData({ ...formData, strategy: e.target.value as PostingStrategy })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={PostingStrategy.RANDOM}>ランダム</option>
              <option value={PostingStrategy.NEWEST_FIRST}>新しいものから順番</option>
              <option value={PostingStrategy.OLDEST_FIRST}>古いものから順番</option>
              <option value={PostingStrategy.MANUAL}>手動選択</option>
            </select>
          </div>

          <div>
            <Label htmlFor="frequency">頻度</Label>
            <select
              id="frequency"
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="every10min">10分ごと</option>
              <option value="hourly">毎時</option>
              <option value="daily">毎日</option>
              <option value="weekly">毎週</option>
            </select>
          </div>

          {(formData.frequency === 'daily' ||
            formData.frequency === 'weekly' ||
            formData.frequency === 'hourly') && (
            <div>
              <Label htmlFor="hour">投稿時刻</Label>
              <Input
                id="hour"
                type="number"
                min="0"
                max="23"
                value={formData.hour}
                onChange={(e) => setFormData({ ...formData, hour: parseInt(e.target.value) })}
              />
            </div>
          )}

          {formData.frequency === 'weekly' && (
            <div>
              <Label htmlFor="weekday">曜日</Label>
              <select
                id="weekday"
                value={formData.weekday}
                onChange={(e) => setFormData({ ...formData, weekday: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>日曜日</option>
                <option value={1}>月曜日</option>
                <option value={2}>火曜日</option>
                <option value={3}>水曜日</option>
                <option value={4}>木曜日</option>
                <option value={5}>金曜日</option>
                <option value={6}>土曜日</option>
              </select>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '作成中...' : '作成する'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
