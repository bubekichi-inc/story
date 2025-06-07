'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/_components/ui/dialog';
import { Button } from '@/app/_components/ui/button';
import { Input } from '@/app/_components/ui/input';
import { Label } from '@/app/_components/ui/label';
import { Checkbox } from '@/app/_components/ui/checkbox';
import {
  PostingStrategy,
  PostingScope,
  Schedule,
  SchedulePost,
  Post,
  PostImage,
} from '@prisma/client';
import { createSchedule, updateSchedule, getPosts } from '../_actions/schedules';
import Image from 'next/image';

type ScheduleWithRelations = Schedule & {
  selectedPosts: (SchedulePost & {
    post: Post & {
      images: PostImage[];
    };
  })[];
};

type PostWithImages = Post & {
  images: PostImage[];
};

interface ScheduleFormDialogProps {
  // 新規作成の場合
  children?: React.ReactNode;
  // 編集の場合
  schedule?: ScheduleWithRelations | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // 共通
  onSuccess: () => void;
  mode: 'create' | 'edit';
}

export function ScheduleFormDialog({
  children,
  schedule,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
  mode,
}: ScheduleFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<PostWithImages[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    strategy: PostingStrategy.RANDOM as PostingStrategy,
    scope: PostingScope.ALL as PostingScope,
    selectedPostIds: [] as string[],
    frequency: 'daily' as 'minutely' | 'hourly' | 'daily' | 'weekly',
    hour: '9',
    minute: '0',
    dayOfWeek: 'MO' as 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA',
    interval: '10',
    autoReset: true,
  });

  // 制御されたダイアログかどうかを判定
  const isControlled = mode === 'edit';
  const open = isControlled ? (controlledOpen ?? false) : internalOpen;
  const onOpenChange = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;

  useEffect(() => {
    if (schedule && mode === 'edit') {
      setFormData({
        name: schedule.name,
        strategy: schedule.strategy,
        scope: schedule.scope,
        selectedPostIds: schedule.selectedPosts.map((sp) => sp.postId),
        frequency: schedule.rrule?.includes('FREQ=MINUTELY')
          ? 'minutely'
          : schedule.rrule?.includes('FREQ=HOURLY')
            ? 'hourly'
            : schedule.rrule?.includes('FREQ=WEEKLY')
              ? 'weekly'
              : 'daily',
        hour: schedule.rrule?.match(/BYHOUR=(\d+)/)?.[1] || '9',
        minute: schedule.rrule?.match(/BYMINUTE=(\d+)/)?.[1] || '0',
        dayOfWeek:
          (schedule.rrule?.match(/BYDAY=(\w+)/)?.[1] as
            | 'SU'
            | 'MO'
            | 'TU'
            | 'WE'
            | 'TH'
            | 'FR'
            | 'SA') || 'MO',
        interval: schedule.rrule?.match(/INTERVAL=(\d+)/)?.[1] || '10',
        autoReset: schedule.autoReset,
      });
    } else if (mode === 'create') {
      // 新規作成時はフォームをリセット
      setFormData({
        name: '',
        strategy: PostingStrategy.RANDOM,
        scope: PostingScope.ALL,
        selectedPostIds: [],
        frequency: 'daily',
        hour: '9',
        minute: '0',
        dayOfWeek: 'MO',
        interval: '10',
        autoReset: true,
      });
    }
  }, [schedule, mode]);

  useEffect(() => {
    if (open) {
      loadPosts();
    }
  }, [open]);

  const loadPosts = async () => {
    try {
      const data = await getPosts();
      setPosts(data);
    } catch (error) {
      console.error('投稿取得エラー:', error);
    }
  };

  const generateRRule = () => {
    if (formData.frequency === 'minutely') {
      return `FREQ=MINUTELY;INTERVAL=${formData.interval}`;
    } else if (formData.frequency === 'hourly') {
      return `FREQ=HOURLY;BYMINUTE=${formData.minute}`;
    } else if (formData.frequency === 'daily') {
      return `FREQ=DAILY;BYHOUR=${formData.hour};BYMINUTE=${formData.minute}`;
    } else if (formData.frequency === 'weekly') {
      return `FREQ=WEEKLY;BYDAY=${formData.dayOfWeek};BYHOUR=${formData.hour};BYMINUTE=${formData.minute}`;
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const rrule = generateRRule();

      if (mode === 'create') {
        const result = await createSchedule({
          name: formData.name,
          strategy: formData.strategy,
          scope: formData.scope,
          selectedPostIds:
            formData.scope === PostingScope.SELECTED ? formData.selectedPostIds : undefined,
          rrule,
          timezone: 'Asia/Tokyo',
          autoReset: formData.autoReset,
        });

        if (result.success) {
          onSuccess();
          onOpenChange(false);
        } else {
          console.error('作成失敗:', result.error);
          alert(result.error || '作成に失敗しました');
        }
      } else if (schedule) {
        const result = await updateSchedule(schedule.id, {
          name: formData.name,
          strategy: formData.strategy,
          scope: formData.scope,
          selectedPostIds:
            formData.scope === PostingScope.SELECTED ? formData.selectedPostIds : undefined,
          rrule,
          timezone: 'Asia/Tokyo',
          autoReset: formData.autoReset,
        });

        if (result.success) {
          onSuccess();
          onOpenChange(false);
        } else {
          console.error('更新失敗:', result.error);
          alert(result.error || '更新に失敗しました');
        }
      }
    } catch (error) {
      console.error(`${mode === 'create' ? '作成' : '更新'}エラー:`, error);
      alert(`${mode === 'create' ? '作成' : '更新'}に失敗しました`);
    } finally {
      setLoading(false);
    }
  };

  const togglePostSelection = (postId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedPostIds: prev.selectedPostIds.includes(postId)
        ? prev.selectedPostIds.filter((id) => id !== postId)
        : [...prev.selectedPostIds, postId],
    }));
  };

  const dialogContent = (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{mode === 'create' ? 'スケジュール作成' : 'スケジュール編集'}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="name">スケジュール名</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="例: 朝9時ランダム投稿"
            required
          />
        </div>

        <div>
          <Label>投稿戦略</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {Object.values(PostingStrategy).map((strategy) => (
              <Button
                key={strategy}
                type="button"
                variant={formData.strategy === strategy ? 'default' : 'outline'}
                onClick={() => setFormData((prev) => ({ ...prev, strategy }))}
                className="text-sm"
              >
                {strategy === PostingStrategy.RANDOM
                  ? 'ランダム'
                  : strategy === PostingStrategy.NEWEST_FIRST
                    ? '新しい順'
                    : '古い順'}
              </Button>
            ))}
          </div>
        </div>

        {(formData.strategy === PostingStrategy.RANDOM ||
          formData.strategy === PostingStrategy.NEWEST_FIRST ||
          formData.strategy === PostingStrategy.OLDEST_FIRST) && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoReset"
              checked={formData.autoReset}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, autoReset: checked === true }))
              }
            />
            <Label htmlFor="autoReset" className="text-sm font-normal">
              全ての投稿完了後に自動的にサイクルをリセットする
            </Label>
          </div>
        )}

        <div>
          <Label>投稿対象</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {Object.values(PostingScope).map((scope) => (
              <Button
                key={scope}
                type="button"
                variant={formData.scope === scope ? 'default' : 'outline'}
                onClick={() => setFormData((prev) => ({ ...prev, scope }))}
                className="text-sm"
              >
                {scope === PostingScope.ALL ? '全ての投稿' : '選択した投稿'}
              </Button>
            ))}
          </div>
        </div>

        {formData.scope === PostingScope.SELECTED && (
          <div>
            <Label>投稿を選択</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className={`border-2 rounded-lg p-3 cursor-pointer transition-colors ${
                    formData.selectedPostIds.includes(post.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => togglePostSelection(post.id)}
                >
                  {post.images.length > 0 && (
                    <Image
                      src={post.images[0].imageUrl}
                      alt="投稿画像"
                      width={150}
                      height={150}
                      className="w-full h-32 object-cover rounded mb-2"
                    />
                  )}
                  <div className="text-sm truncate">{post.storyText || `投稿 #${post.order}`}</div>
                </div>
              ))}
            </div>
            {formData.selectedPostIds.length === 0 && (
              <p className="text-sm text-red-500 mt-2">少なくとも1つの投稿を選択してください</p>
            )}
          </div>
        )}

        <div>
          <Label>投稿頻度</Label>
          <div className="grid grid-cols-4 gap-2 mt-2">
            <Button
              type="button"
              variant={formData.frequency === 'minutely' ? 'default' : 'outline'}
              onClick={() => setFormData((prev) => ({ ...prev, frequency: 'minutely' }))}
              className="text-sm"
            >
              分ごと
            </Button>
            <Button
              type="button"
              variant={formData.frequency === 'hourly' ? 'default' : 'outline'}
              onClick={() => setFormData((prev) => ({ ...prev, frequency: 'hourly' }))}
              className="text-sm"
            >
              毎時
            </Button>
            <Button
              type="button"
              variant={formData.frequency === 'daily' ? 'default' : 'outline'}
              onClick={() => setFormData((prev) => ({ ...prev, frequency: 'daily' }))}
              className="text-sm"
            >
              毎日
            </Button>
            <Button
              type="button"
              variant={formData.frequency === 'weekly' ? 'default' : 'outline'}
              onClick={() => setFormData((prev) => ({ ...prev, frequency: 'weekly' }))}
              className="text-sm"
            >
              毎週
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {formData.frequency === 'minutely' && (
              <div>
                <Label>間隔（分）</Label>
                <Input
                  type="number"
                  min="1"
                  max="59"
                  value={formData.interval}
                  onChange={(e) => setFormData((prev) => ({ ...prev, interval: e.target.value }))}
                />
              </div>
            )}

            {formData.frequency === 'hourly' && (
              <div>
                <Label>分</Label>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={formData.minute}
                  onChange={(e) => setFormData((prev) => ({ ...prev, minute: e.target.value }))}
                />
              </div>
            )}

            {(formData.frequency === 'daily' || formData.frequency === 'weekly') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>時間</Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={formData.hour}
                    onChange={(e) => setFormData((prev) => ({ ...prev, hour: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>分</Label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={formData.minute}
                    onChange={(e) => setFormData((prev) => ({ ...prev, minute: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {formData.frequency === 'weekly' && (
              <div>
                <Label>曜日</Label>
                <div className="grid grid-cols-7 gap-1 mt-2">
                  {[
                    { key: 'SU', label: '日' },
                    { key: 'MO', label: '月' },
                    { key: 'TU', label: '火' },
                    { key: 'WE', label: '水' },
                    { key: 'TH', label: '木' },
                    { key: 'FR', label: '金' },
                    { key: 'SA', label: '土' },
                  ].map((day) => (
                    <Button
                      key={day.key}
                      type="button"
                      variant={formData.dayOfWeek === day.key ? 'default' : 'outline'}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          dayOfWeek: day.key as 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA',
                        }))
                      }
                      className="text-sm p-2"
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            disabled={
              loading ||
              (formData.scope === PostingScope.SELECTED && formData.selectedPostIds.length === 0)
            }
          >
            {loading
              ? `${mode === 'create' ? '作成中' : '更新中'}...`
              : mode === 'create'
                ? '作成'
                : '更新'}
          </Button>
        </div>
      </form>
    </DialogContent>
  );

  if (mode === 'create') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  } else {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {dialogContent}
      </Dialog>
    );
  }
}
