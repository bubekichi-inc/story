'use client';

import { useState, useEffect } from 'react';
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
import { PostingStrategy, PostingScope } from '@prisma/client';
import { createSchedule, getPosts } from '../_actions/schedules';
import Image from 'next/image';

interface CreateScheduleDialogProps {
  children: React.ReactNode;
}

interface Post {
  id: string;
  order: number;
  createdAt: Date;
  images: {
    id: string;
    imageUrl: string;
    fileName: string;
  }[];
}

export function CreateScheduleDialog({ children }: CreateScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<{
    name: string;
    strategy: PostingStrategy;
    scope: PostingScope;
    frequency: string;
    hour: number;
    weekday: number;
  }>({
    name: '',
    strategy: PostingStrategy.RANDOM,
    scope: PostingScope.ALL,
    frequency: 'every10min',
    hour: 9,
    weekday: 1, // 月曜日
  });

  // ダイアログが開かれたときにPostsを取得
  useEffect(() => {
    if (open) {
      loadPosts();
    }
  }, [open]);

  const loadPosts = async () => {
    try {
      const postsData = await getPosts();
      setPosts(postsData);
    } catch (error) {
      console.error('Posts取得エラー:', error);
    }
  };

  const togglePostSelection = (postId: string) => {
    const newSelected = new Set(selectedPostIds);
    if (newSelected.has(postId)) {
      newSelected.delete(postId);
    } else {
      newSelected.add(postId);
    }
    setSelectedPostIds(newSelected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // SELECTEDスコープで投稿が選択されていない場合はエラー
      if (formData.scope === PostingScope.SELECTED && selectedPostIds.size === 0) {
        alert('投稿を選択してください');
        setLoading(false);
        return;
      }

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
        scope: formData.scope,
        selectedPostIds:
          formData.scope === PostingScope.SELECTED ? Array.from(selectedPostIds) : undefined,
        rrule: rruleString,
      });

      if (result.success) {
        setOpen(false);
        setFormData({
          name: '',
          strategy: PostingStrategy.RANDOM,
          scope: PostingScope.ALL,
          frequency: 'every10min',
          hour: 9,
          weekday: 1,
        });
        setSelectedPostIds(new Set());
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
            </select>
          </div>

          <div>
            <Label htmlFor="scope">投稿対象</Label>
            <select
              id="scope"
              value={formData.scope}
              onChange={(e) => setFormData({ ...formData, scope: e.target.value as PostingScope })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={PostingScope.ALL}>全てのPost</option>
              <option value={PostingScope.SELECTED}>選択されたPost</option>
            </select>
          </div>

          {formData.scope === PostingScope.SELECTED && (
            <div>
              <Label>投稿を選択 ({selectedPostIds.size}件選択中)</Label>
              <div className="mt-2 grid grid-cols-4 gap-2 max-h-64 overflow-y-auto border rounded-md p-2">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className={`relative cursor-pointer border-2 rounded-md overflow-hidden ${
                      selectedPostIds.has(post.id)
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => togglePostSelection(post.id)}
                  >
                    {post.images[0] && (
                      <Image
                        src={post.images[0].imageUrl}
                        alt={post.images[0].fileName}
                        width={100}
                        height={150}
                        className="w-full aspect-[2/3] object-cover"
                      />
                    )}
                    {selectedPostIds.has(post.id) && (
                      <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        ✓
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {posts.length === 0 && (
                <div className="text-sm text-gray-500 mt-2">投稿がありません</div>
              )}
            </div>
          )}

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
