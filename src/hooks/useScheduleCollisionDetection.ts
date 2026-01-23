import { useMemo } from 'react';
import { ScheduleType } from '../types/schedules';

export interface Schedule {
  id?: string;
  daypart_name: string;
  days_of_week: number[];
  start_time: string | null;
  end_time: string | null;
  runs_on_days?: boolean;
  schedule_type?: ScheduleType;
  schedule_name?: string;
  event_name?: string;
  event_date?: string;
  recurrence_type?: string;
  recurrence_config?: any;
  priority_level?: number;
}

export interface CollisionResult {
  hasCollision: boolean;
  collisionMessage: string | null;
  conflictingDays: number[];
}

export function useScheduleCollisionDetection(
  schedules: Schedule[],
  currentDaypartName: string,
  selectedDays: number[],
  editingScheduleId?: string,
  currentScheduleType?: ScheduleType
): CollisionResult {
  return useMemo(() => {
    if (!currentDaypartName || selectedDays.length === 0) {
      return {
        hasCollision: false,
        collisionMessage: null,
        conflictingDays: []
      };
    }

    if (currentScheduleType === 'event_holiday') {
      return {
        hasCollision: false,
        collisionMessage: null,
        conflictingDays: []
      };
    }

    const conflictingSchedules = schedules.filter(schedule => {
      if (editingScheduleId && schedule.id === editingScheduleId) return false;
      if (schedule.schedule_type === 'event_holiday') return false;
      if (schedule.daypart_name !== currentDaypartName) return false;
      return schedule.days_of_week.some(day => selectedDays.includes(day));
    });

    if (conflictingSchedules.length === 0) {
      return {
        hasCollision: false,
        collisionMessage: null,
        conflictingDays: []
      };
    }

    const conflictingDays = conflictingSchedules
      .flatMap(s => s.days_of_week)
      .filter(day => selectedDays.includes(day))
      .filter((day, index, self) => self.indexOf(day) === index)
      .sort();

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const conflictingDayNames = conflictingDays.map(day => dayNames[day]).join(', ');

    return {
      hasCollision: true,
      collisionMessage: `This daypart already has a schedule for: ${conflictingDayNames}`,
      conflictingDays
    };
  }, [schedules, currentDaypartName, selectedDays, editingScheduleId, currentScheduleType]);
}

export function getDayCollisionStatus(
  schedules: Schedule[],
  currentDaypartName: string,
  day: number,
  selectedDays: number[],
  editingScheduleId?: string,
  currentScheduleType?: ScheduleType
): boolean {
  if (!currentDaypartName) return false;
  if (currentScheduleType === 'event_holiday') return false;

  return schedules.some(schedule => {
    if (editingScheduleId && schedule.id === editingScheduleId) return false;
    if (schedule.schedule_type === 'event_holiday') return false;
    if (!schedule.daypart_name || !schedule.days_of_week) return false;

    const daypartMatches = schedule.daypart_name === currentDaypartName;
    const dayInSchedule = schedule.days_of_week.some(d => Number(d) === Number(day));

    return daypartMatches && dayInSchedule;
  });
}

export function getDayUsageInfo(
  schedules: Schedule[],
  currentDaypartName: string,
  day: number,
  editingScheduleId?: string,
  currentScheduleType?: ScheduleType
): { usedBySameDaypart: boolean; usedByOtherDayparts: string[] } {
  const regularSchedules = schedules.filter(s => s.schedule_type !== 'event_holiday');

  const sameDaypart = regularSchedules
    .filter(s => s.id !== editingScheduleId && s.daypart_name === currentDaypartName && s.days_of_week.includes(day))
    .length > 0;

  const otherDayparts = regularSchedules
    .filter(s => s.id !== editingScheduleId && s.daypart_name !== currentDaypartName && s.days_of_week.includes(day))
    .map(s => s.daypart_name)
    .filter((name, index, self) => self.indexOf(name) === index);

  return {
    usedBySameDaypart: currentScheduleType !== 'event_holiday' && sameDaypart,
    usedByOtherDayparts: currentScheduleType !== 'event_holiday' ? otherDayparts : []
  };
}
