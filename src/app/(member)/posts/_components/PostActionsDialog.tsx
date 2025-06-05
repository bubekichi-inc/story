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
import { Calendar, Send } from 'lucide-react';
import { scheduleOneTimePost, postImmediately } from '../../schedules/_actions/schedules';
import { toast } from 'sonner';

interface PostActionsDialogProps {
  postId: string;
  children: React.ReactNode;
}

export function PostActionsDialog({ postId, children }: PostActionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  const handleImmediatePost = async () => {
    setLoading(true);
    try {
      const result = await postImmediately(postId);
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('投稿に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduledPost = async () => {
    if (!scheduledDateTime) {
      toast.error('投稿日時を選択してください');
      return;
    }

    const scheduledAt = new Date(scheduledDateTime);
    if (scheduledAt <= new Date()) {
      toast.error('未来の日時を選択してください');
      return;
    }

    setLoading(true);
    try {
      const result = await scheduleOneTimePost({
        postId,
        scheduledAt,
      });

      if (result.success) {
        toast.success('投稿を予約しました');
        setOpen(false);
        setScheduledDateTime('');
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('予約に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 現在時刻から1時間後をデフォルトに設定
  const getDefaultDateTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return now.toISOString().slice(0, 16);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>投稿オプション</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* 即時投稿 */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Send className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium">即時投稿</h3>
                <p className="text-sm text-gray-600">今すぐInstagramストーリーに投稿</p>
              </div>
            </div>
            <Button onClick={handleImmediatePost} disabled={loading} className="w-full">
              {loading ? '投稿中...' : '今すぐ投稿'}
            </Button>
          </div>

          {/* 予約投稿 */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Calendar className="h-5 w-5 text-green-600" />
              <div>
                <h3 className="font-medium">予約投稿</h3>
                <p className="text-sm text-gray-600">指定した日時に自動投稿</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="datetime">投稿日時</Label>
                <Input
                  id="datetime"
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  placeholder={getDefaultDateTime()}
                />
              </div>
              <Button
                onClick={handleScheduledPost}
                disabled={loading || !scheduledDateTime}
                variant="outline"
                className="w-full"
              >
                {loading ? '予約中...' : '投稿を予約'}
              </Button>
            </div>
          </div>

          <div className="pt-2 border-t">
            <Button variant="ghost" onClick={() => setOpen(false)} className="w-full">
              キャンセル
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
