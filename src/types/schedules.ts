export type ScheduleType = 'regular' | 'event_holiday';

export type RecurrenceType =
  | 'none'
  | 'annual_date'
  | 'monthly_date'
  | 'annual_relative'
  | 'annual_date_range';

export type DayPosition = 'first' | 'second' | 'third' | 'fourth' | 'last';

export interface RecurrenceConfig {
  month?: number;
  day_of_month?: number;
  weekday?: number;
  position?: DayPosition;
  range_start_date?: string;
  range_end_date?: string;
}

export interface BaseSchedule {
  id: string;
  schedule_group_id: string;
  start_time: string;
  end_time: string;
  created_at?: string;
  updated_at?: string;
  schedule_type?: ScheduleType;
  event_name?: string;
  event_date?: string;
  recurrence_type?: RecurrenceType;
  recurrence_config?: RecurrenceConfig;
  priority_level?: number;
}

export interface StoreOperationSchedule extends BaseSchedule {
  days: number[];
}

export interface DaypartSchedule extends BaseSchedule {
  day: number;
  daypart_definition_id: string;
}

export interface PlacementOverrideSchedule extends BaseSchedule {
  day: number;
  daypart_name: string;
}

export function isEventSchedule(schedule: BaseSchedule): boolean {
  return schedule.schedule_type === 'event_holiday';
}

export function isSingleDayEvent(schedule: BaseSchedule): boolean {
  return isEventSchedule(schedule) &&
         (schedule.recurrence_type === 'none' ||
          schedule.recurrence_type === 'annual_date' ||
          schedule.recurrence_type === 'monthly_date' ||
          schedule.recurrence_type === 'annual_relative');
}

export function isDateRangeEvent(schedule: BaseSchedule): boolean {
  return isEventSchedule(schedule) && schedule.recurrence_type === 'annual_date_range';
}

export function getPriorityLevel(recurrenceType?: RecurrenceType): number {
  if (!recurrenceType) return 10;
  return recurrenceType === 'annual_date_range' ? 50 : 100;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const POSITION_NAMES: Record<DayPosition, string> = {
  first: 'First',
  second: 'Second',
  third: 'Third',
  fourth: 'Fourth',
  last: 'Last'
};

export function formatRecurrenceText(
  recurrenceType?: RecurrenceType,
  recurrenceConfig?: RecurrenceConfig,
  eventDate?: string
): string {
  if (!recurrenceType) return '';

  switch (recurrenceType) {
    case 'none':
      if (eventDate) {
        const date = new Date(eventDate);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      return 'One-time event';

    case 'annual_date':
      if (recurrenceConfig?.month !== undefined && recurrenceConfig?.day_of_month !== undefined) {
        const monthName = MONTH_NAMES[recurrenceConfig.month - 1];
        return `Every ${monthName} ${recurrenceConfig.day_of_month}`;
      }
      return 'Annual event';

    case 'monthly_date':
      if (recurrenceConfig?.day_of_month !== undefined) {
        const suffix = getOrdinalSuffix(recurrenceConfig.day_of_month);
        return `The ${recurrenceConfig.day_of_month}${suffix} of every month`;
      }
      return 'Monthly event';

    case 'annual_relative':
      if (recurrenceConfig?.month !== undefined &&
          recurrenceConfig?.position &&
          recurrenceConfig?.weekday !== undefined) {
        const monthName = MONTH_NAMES[recurrenceConfig.month - 1];
        const positionName = POSITION_NAMES[recurrenceConfig.position];
        const dayName = DAY_NAMES[recurrenceConfig.weekday];
        return `${positionName} ${dayName} of ${monthName} each year`;
      }
      return 'Annual relative event';

    case 'annual_date_range':
      if (recurrenceConfig?.range_start_date && recurrenceConfig?.range_end_date) {
        const startDate = new Date(recurrenceConfig.range_start_date);
        const endDate = new Date(recurrenceConfig.range_end_date);
        const startStr = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        const endStr = endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        return `${startStr} - ${endStr} annually`;
      }
      return 'Annual date range';

    default:
      return '';
  }
}

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export function calculateNextOccurrence(
  recurrenceType?: RecurrenceType,
  recurrenceConfig?: RecurrenceConfig,
  eventDate?: string
): Date | null {
  if (!recurrenceType) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  switch (recurrenceType) {
    case 'none':
      return eventDate ? new Date(eventDate) : null;

    case 'annual_date':
      if (recurrenceConfig?.month !== undefined && recurrenceConfig?.day_of_month !== undefined) {
        const thisYear = new Date(now.getFullYear(), recurrenceConfig.month - 1, recurrenceConfig.day_of_month);
        if (thisYear >= now) return thisYear;
        return new Date(now.getFullYear() + 1, recurrenceConfig.month - 1, recurrenceConfig.day_of_month);
      }
      return null;

    case 'monthly_date':
      if (recurrenceConfig?.day_of_month !== undefined) {
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), recurrenceConfig.day_of_month);
        if (thisMonth >= now) return thisMonth;
        return new Date(now.getFullYear(), now.getMonth() + 1, recurrenceConfig.day_of_month);
      }
      return null;

    case 'annual_relative':
      if (recurrenceConfig?.month !== undefined &&
          recurrenceConfig?.position &&
          recurrenceConfig?.weekday !== undefined) {
        const date = calculateRelativeDate(
          now.getFullYear(),
          recurrenceConfig.month,
          recurrenceConfig.position,
          recurrenceConfig.weekday
        );
        if (date >= now) return date;
        return calculateRelativeDate(
          now.getFullYear() + 1,
          recurrenceConfig.month,
          recurrenceConfig.position,
          recurrenceConfig.weekday
        );
      }
      return null;

    case 'annual_date_range':
      if (recurrenceConfig?.range_start_date) {
        const startDate = new Date(recurrenceConfig.range_start_date);
        const thisYear = new Date(now.getFullYear(), startDate.getMonth(), startDate.getDate());
        if (thisYear >= now) return thisYear;
        return new Date(now.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
      }
      return null;

    default:
      return null;
  }
}

function calculateRelativeDate(
  year: number,
  month: number,
  position: DayPosition,
  weekday: number
): Date {
  const firstDay = new Date(year, month - 1, 1);

  if (position === 'last') {
    const lastDay = new Date(year, month, 0);
    let date = lastDay.getDate();
    while (new Date(year, month - 1, date).getDay() !== weekday) {
      date--;
    }
    return new Date(year, month - 1, date);
  }

  const positionMap = { first: 1, second: 2, third: 3, fourth: 4 };
  const occurrence = positionMap[position as keyof typeof positionMap];

  let date = 1;
  let count = 0;

  while (date <= 31 && count < occurrence) {
    const current = new Date(year, month - 1, date);
    if (current.getDay() === weekday) {
      count++;
      if (count === occurrence) {
        return current;
      }
    }
    date++;
  }

  return new Date(year, month - 1, 1);
}

export function getNextThreeOccurrences(
  recurrenceType?: RecurrenceType,
  recurrenceConfig?: RecurrenceConfig,
  eventDate?: string
): Date[] {
  if (!recurrenceType || recurrenceType === 'none') {
    const date = calculateNextOccurrence(recurrenceType, recurrenceConfig, eventDate);
    return date ? [date] : [];
  }

  const occurrences: Date[] = [];
  const first = calculateNextOccurrence(recurrenceType, recurrenceConfig, eventDate);

  if (!first) return [];

  occurrences.push(first);

  for (let i = 1; i < 3; i++) {
    const config = { ...recurrenceConfig };

    switch (recurrenceType) {
      case 'annual_date':
      case 'annual_relative':
      case 'annual_date_range':
        if (config.month !== undefined) {
          const nextYear = first.getFullYear() + i;
          const next = calculateRelativeOrAnnualDate(nextYear, recurrenceType, config);
          if (next) occurrences.push(next);
        }
        break;

      case 'monthly_date':
        if (config.day_of_month !== undefined) {
          const nextMonth = new Date(first);
          nextMonth.setMonth(first.getMonth() + i);
          occurrences.push(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), config.day_of_month));
        }
        break;
    }
  }

  return occurrences;
}

function calculateRelativeOrAnnualDate(
  year: number,
  recurrenceType: RecurrenceType,
  config: RecurrenceConfig
): Date | null {
  if (recurrenceType === 'annual_date' && config.month !== undefined && config.day_of_month !== undefined) {
    return new Date(year, config.month - 1, config.day_of_month);
  }

  if (recurrenceType === 'annual_relative' &&
      config.month !== undefined &&
      config.position &&
      config.weekday !== undefined) {
    return calculateRelativeDate(year, config.month, config.position, config.weekday);
  }

  if (recurrenceType === 'annual_date_range' && config.range_start_date) {
    const startDate = new Date(config.range_start_date);
    return new Date(year, startDate.getMonth(), startDate.getDate());
  }

  return null;
}
