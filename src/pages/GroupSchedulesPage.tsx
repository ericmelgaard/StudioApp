import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import GroupScheduleManager from '../components/GroupScheduleManager';
import ScheduleEditPage from './ScheduleEditPage';

interface GroupSchedulesPageProps {
  group: {
    id: string;
    name: string;
  };
  onBack: () => void;
}

interface Schedule {
  id: string;
  daypart_definition_id: string;
  placement_group_id: string;
  days_of_week: number[];
  start_time: string;
  end_time?: string;
  runs_on_days?: boolean;
  schedule_name?: string;
}

interface Daypart {
  id: string;
  daypart_name: string;
  display_label: string;
  color: string;
  icon: string | null;
}

type PageView = 'list' | 'edit';

export default function GroupSchedulesPage({ group, onBack }: GroupSchedulesPageProps) {
  const [currentView, setCurrentView] = useState<PageView>('list');
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [dayparts, setDayparts] = useState<Daypart[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDayparts();
  }, [group.id]);

  const loadDayparts = async () => {
    setLoading(true);
    try {
      const groupResult = await supabase
        .from('placement_groups')
        .select('store_id')
        .eq('id', group.id)
        .maybeSingle();

      if (groupResult.error) throw groupResult.error;

      const storeId = groupResult.data?.store_id;

      const daypartsResult = storeId
        ? await supabase.rpc('get_effective_daypart_definitions', { p_store_id: storeId })
        : await supabase
            .from('daypart_definitions')
            .select('id, daypart_name, display_label, color, icon')
            .is('concept_id', null)
            .is('store_id', null)
            .eq('is_active', true)
            .order('sort_order');

      if (daypartsResult.error) throw daypartsResult.error;

      setDayparts(daypartsResult.data || []);
    } catch (error) {
      console.error('Error loading dayparts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSchedule = (schedule: Schedule | null) => {
    setEditingSchedule(schedule);
    setCurrentView('edit');
  };

  const handleAddScheduleForDays = (schedule: Schedule) => {
    // Handle adding a schedule for specific days (from "Schedule Remaining Days")
    setEditingSchedule(schedule);
    setCurrentView('edit');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setEditingSchedule(null);
  };

  const handleSuccess = () => {
    setCurrentView('list');
    setEditingSchedule(null);
  };

  const handleDelete = async (scheduleId: string) => {
    const { error } = await supabase
      .from('site_daypart_routines')
      .delete()
      .eq('id', scheduleId);

    if (error) throw error;
  };

  if (currentView === 'edit') {
    return (
      <ScheduleEditPage
        schedule={editingSchedule}
        groupId={group.id}
        groupName={group.name}
        dayparts={dayparts}
        onBack={handleBackToList}
        onSuccess={handleSuccess}
        onDelete={editingSchedule ? handleDelete : undefined}
      />
    );
  }

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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <GroupScheduleManager
              groupId={group.id}
              groupName={group.name}
              onEditSchedule={handleEditSchedule}
            />
          )}
        </div>
      </div>
    </div>
  );
}
