'use client';

import { useState } from 'react';
import { Button } from '@/app/_components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/_components/ui/dialog';
import { Input } from '@/app/_components/ui/input';
import { Label } from '@/app/_components/ui/label';
import { createSinglePost } from '@/app/(member)/posts/_actions/posts';
import { Plus, Upload, X } from 'lucide-react';
import Image from 'next/image';

export default function UploadDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(
    null
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const maxSize = 5 * 1024 * 1024; // 5MB制限

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/')) {
        setMessage(`${file.name} は画像ファイルではありません`);
        return false;
      }
      if (file.size > maxSize) {
        setMessage(`${file.name} のファイルサイズが大きすぎます（5MB以下にしてください）`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setMessage('');
      setSelectedFiles([...selectedFiles, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (formData: FormData) => {
    if (selectedFiles.length === 0) {
      setMessage('画像を選択してください');
      return;
    }

    setLoading(true);
    setUploadProgress({ current: 0, total: selectedFiles.length });
    setMessage(`${selectedFiles.length}件の投稿を作成中...`);

    try {
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      // 画像を一つずつ順次処理
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress({ current: i + 1, total: selectedFiles.length });
        setMessage(`${i + 1}/${selectedFiles.length}件目を処理中... (${file.name})`);

        // 個別のFormDataを作成
        const singleFormData = new FormData();
        singleFormData.append('image', file);

        try {
          const result = await createSinglePost(singleFormData);

          if (result.success) {
            successCount++;
          } else {
            failCount++;
            errors.push(`${file.name}: ${result.message}`);
          }
        } catch (error) {
          failCount++;
          errors.push(`${file.name}: 処理に失敗しました`);
        }
      }

      // 結果をユーザーに表示
      if (failCount === 0) {
        setMessage(`${successCount}件の投稿を作成しました！`);
        setSelectedFiles([]);
        setTimeout(() => {
          setOpen(false);
          setMessage('');
          setUploadProgress(null);
        }, 1500);
      } else if (successCount > 0) {
        setMessage(`${successCount}件成功、${failCount}件失敗しました。`);
        // 失敗した画像のみ残す
        const failedFiles = selectedFiles.filter((_, index) => {
          const fileName = selectedFiles[index].name;
          return errors.some((error) => error.startsWith(fileName));
        });
        setSelectedFiles(failedFiles);
      } else {
        setMessage(`すべての投稿作成に失敗しました。エラー: ${errors.join(', ')}`);
      }
    } catch (error) {
      setMessage('投稿の作成に失敗しました');
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 font-bold">
          <Plus className="w-4 h-4 mr-1" />
          画像をアップロード
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>画像をアップロード</DialogTitle>
          <DialogDescription>
            ストーリーズ用の画像をアップロードしてください。各画像は個別の投稿として作成されます。
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="images">画像ファイル</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 mb-2">
                画像をドラッグ&ドロップまたはクリックして選択（各画像は個別の投稿になります）
              </p>
              <Input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('images')?.click()}
                className="cursor-pointer"
              >
                ファイルを選択
              </Button>
            </div>
          </div>

          {/* 選択されたファイルのプレビュー */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>
                選択された画像 ({selectedFiles.length}枚 → {selectedFiles.length}件の投稿)
              </Label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="relative">
                    <div className="w-full h-20 relative rounded border overflow-hidden">
                      <Image
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b">
                      {file.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>進行状況</span>
                <span>
                  {uploadProgress.current}/{uploadProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          )}

          {message && (
            <div
              className={`text-sm ${
                message.includes('失敗') || message.includes('エラー')
                  ? 'text-red-600'
                  : 'text-green-600'
              }`}
            >
              {message}
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={loading || selectedFiles.length === 0}>
              {loading
                ? uploadProgress
                  ? `${uploadProgress.current}/${uploadProgress.total}件処理中...`
                  : `${selectedFiles.length}件の投稿を作成中...`
                : `${selectedFiles.length}件の投稿を作成`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
