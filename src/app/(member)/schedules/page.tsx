'use client';

import { useRef } from 'react';
import { Button } from '@/app/_components/ui/button';
import { Plus } from 'lucide-react';
import { ScheduleFormDialog } from './_components/ScheduleFormDialog';
import { ScheduleList } from './_components/ScheduleList';

export default function SchedulesPage() {
  const scheduleListRef = useRef<{ loadSchedules: () => void }>(null);

  const handleSuccess = () => {
    scheduleListRef.current?.loadSchedules();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">投稿スケジュール管理</h1>
          </div>
          <ScheduleFormDialog mode="create" onSuccess={handleSuccess}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新しいスケジュール
            </Button>
          </ScheduleFormDialog>
        </div>
      </div>

      <div className="">
        <div>
          <ScheduleList ref={scheduleListRef} />
        </div>
      </div>
    </div>
  );
}
