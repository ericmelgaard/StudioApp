import { useMemo } from 'react';

export interface Schedule {
  id?: string;
  daypart_name: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
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
  editingScheduleId?: string
): CollisionResult {
  return useMemo(() => {
    if (!currentDaypartName || selectedDays.length === 0) {
      return {
        hasCollision: false,
        collisionMessage: null,
        conflictingDays: []
      };
    }

    const conflictingSchedules = schedules.filter(schedule => {
      if (editingScheduleId && schedule.id === editingScheduleId) return false;
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
  }, [schedules, currentDaypartName, selectedDays, editingScheduleId]);
}

export function getDayCollisionStatus(
  schedules: Schedule[],
  currentDaypartName: string,
  day: number,
  selectedDays: number[],
  editingScheduleId?: string
): boolean {
  if (!currentDaypartName || selectedDays.includes(day)) return false;

  return schedules.some(schedule => {
    if (editingScheduleId && schedule.id === editingScheduleId) return false;
    return schedule.daypart_name === currentDaypartName && schedule.days_of_week.includes(day);
  });
}

export function getDayUsageInfo(
  schedules: Schedule[],
  currentDaypartName: string,
  day: number,
  editingScheduleId?: string
): { usedBySameDaypart: boolean; usedByOtherDayparts: string[] } {
  const sameDaypart = schedules
    .filter(s => s.id !== editingScheduleId && s.daypart_name === currentDaypartName && s.days_of_week.includes(day))
    .length > 0;

  const otherDayparts = schedules
    .filter(s => s.id !== editingScheduleId && s.daypart_name !== currentDaypartName && s.days_of_week.includes(day))
    .map(s => s.daypart_name)
    .filter((name, index, self) => self.indexOf(name) === index);

  return {
    usedBySameDaypart: sameDaypart,
    usedByOtherDayparts: otherDayparts
  };
}
