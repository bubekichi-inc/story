'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/app/_components/ui/dialog';
import { Button } from '@/app/_components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { deleteSchedule } from '../_actions/schedules';

interface DeleteScheduleDialogProps {
  schedule: { id: string; name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteScheduleDialog({
  schedule,
  open,
  onOpenChange,
  onSuccess,
}: DeleteScheduleDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!schedule) return;

    setLoading(true);
    try {
      const result = await deleteSchedule(schedule.id);

      if (result.success) {
        onSuccess();
        onOpenChange(false);
      } else {
        console.error('削除失敗:', result.error);
        alert(result.error || '削除に失敗しました');
      }
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (!schedule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <DialogTitle>スケジュールを削除</DialogTitle>
              <DialogDescription className="mt-2">
                この操作は取り消すことができません。スケジュール「{schedule.name}
                」と関連する投稿履歴も削除されます。
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            キャンセル
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? '削除中...' : '削除'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
