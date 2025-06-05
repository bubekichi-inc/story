import { Button } from '@/app/_components/ui/button';
import { Plus } from 'lucide-react';
import { CreateScheduleDialog } from './_components/CreateScheduleDialog';
import { ScheduleCalendar } from './_components/ScheduleCalendar';
import { ScheduleList } from './_components/ScheduleList';

export default function SchedulesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">投稿スケジュール管理</h1>
          </div>
          <CreateScheduleDialog>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新しいスケジュール
            </Button>
          </CreateScheduleDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* カレンダー表示 */}
        <div>
          <ScheduleCalendar />
        </div>

        {/* スケジュール一覧 */}
        <div>
          <ScheduleList />
        </div>
      </div>
    </div>
  );
}
