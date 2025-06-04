import { Square, CheckSquare, Trash2, X } from 'lucide-react';

interface SelectionActionsProps {
  isSelectionMode: boolean;
  selectedPosts: Set<string>;
  totalPosts: number;
  isDeleting: boolean;
  onSelectAll: () => void;
  onBulkDelete: () => void;
  onToggleSelectionMode: () => void;
}

export default function SelectionActions({
  isSelectionMode,
  selectedPosts,
  totalPosts,
  isDeleting,
  onSelectAll,
  onBulkDelete,
  onToggleSelectionMode,
}: SelectionActionsProps) {
  if (isSelectionMode) {
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={onSelectAll}
          className="flex items-center space-x-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
        >
          {selectedPosts.size === totalPosts ? (
            <CheckSquare className="w-4 h-4" />
          ) : (
            <Square className="w-4 h-4" />
          )}
          <span>全選択</span>
        </button>
        {selectedPosts.size > 0 && (
          <button
            onClick={onBulkDelete}
            disabled={isDeleting}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? '削除中...' : `削除 (${selectedPosts.size})`}</span>
          </button>
        )}
        <button
          onClick={onToggleSelectionMode}
          className="flex items-center space-x-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
        >
          <X className="w-4 h-4" />
          <span>キャンセル</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onToggleSelectionMode}
      className="flex items-center space-x-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
    >
      <Square className="w-4 h-4" />
      <span>選択</span>
    </button>
  );
}
