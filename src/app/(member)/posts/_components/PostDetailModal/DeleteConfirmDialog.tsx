'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/app/_components/ui/button';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmDialog({
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <h3 className="text-lg font-semibold">投稿を削除</h3>
        </div>
        <p className="text-gray-600 mb-6">この投稿を削除しますか？この操作は取り消せません。</p>
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            キャンセル
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            削除する
          </Button>
        </div>
      </div>
    </div>
  );
}
