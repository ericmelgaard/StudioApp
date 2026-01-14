import { ArrowLeft, Calendar } from 'lucide-react';
import GroupScheduleManager from '../components/GroupScheduleManager';

interface GroupSchedulesPageProps {
  group: {
    id: string;
    name: string;
  };
  onBack: () => void;
}

export default function GroupSchedulesPage({ group, onBack }: GroupSchedulesPageProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Schedules</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{group.name}</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <GroupScheduleManager groupId={group.id} groupName={group.name} />
        </div>
      </div>
    </div>
  );
}
