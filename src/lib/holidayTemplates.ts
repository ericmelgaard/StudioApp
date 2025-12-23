import { RecurrenceConfig, RecurrenceType } from '../types/schedules';

export interface HolidayTemplate {
  id: string;
  name: string;
  category: 'federal' | 'seasonal' | 'custom';
  recurrence_type: RecurrenceType;
  recurrence_config: RecurrenceConfig;
  suggested_hours?: {
    start_time: string;
    end_time: string;
  };
  is_closed?: boolean;
  description: string;
}

export const HOLIDAY_TEMPLATES: HolidayTemplate[] = [
  {
    id: 'new-years-day',
    name: "New Year's Day",
    category: 'federal',
    recurrence_type: 'annual_date',
    recurrence_config: { month: 1, day_of_month: 1 },
    is_closed: true,
    description: 'January 1st - Typically closed'
  },
  {
    id: 'mlk-day',
    name: 'Martin Luther King Jr. Day',
    category: 'federal',
    recurrence_type: 'annual_relative',
    recurrence_config: { month: 1, position: 'third', weekday: 1 },
    suggested_hours: { start_time: '10:00', end_time: '18:00' },
    description: 'Third Monday of January'
  },
  {
    id: 'presidents-day',
    name: "Presidents' Day",
    category: 'federal',
    recurrence_type: 'annual_relative',
    recurrence_config: { month: 2, position: 'third', weekday: 1 },
    suggested_hours: { start_time: '10:00', end_time: '18:00' },
    description: 'Third Monday of February'
  },
  {
    id: 'memorial-day',
    name: 'Memorial Day',
    category: 'federal',
    recurrence_type: 'annual_relative',
    recurrence_config: { month: 5, position: 'last', weekday: 1 },
    suggested_hours: { start_time: '10:00', end_time: '18:00' },
    description: 'Last Monday of May'
  },
  {
    id: 'independence-day',
    name: 'Independence Day',
    category: 'federal',
    recurrence_type: 'annual_date',
    recurrence_config: { month: 7, day_of_month: 4 },
    is_closed: true,
    description: 'July 4th - Typically closed'
  },
  {
    id: 'labor-day',
    name: 'Labor Day',
    category: 'federal',
    recurrence_type: 'annual_relative',
    recurrence_config: { month: 9, position: 'first', weekday: 1 },
    suggested_hours: { start_time: '10:00', end_time: '18:00' },
    description: 'First Monday of September'
  },
  {
    id: 'thanksgiving',
    name: 'Thanksgiving',
    category: 'federal',
    recurrence_type: 'annual_relative',
    recurrence_config: { month: 11, position: 'fourth', weekday: 4 },
    is_closed: true,
    description: 'Fourth Thursday of November - Typically closed'
  },
  {
    id: 'black-friday',
    name: 'Black Friday',
    category: 'custom',
    recurrence_type: 'annual_relative',
    recurrence_config: { month: 11, position: 'fourth', weekday: 5 },
    suggested_hours: { start_time: '06:00', end_time: '23:00' },
    description: 'Day after Thanksgiving - Extended hours'
  },
  {
    id: 'christmas-eve',
    name: 'Christmas Eve',
    category: 'federal',
    recurrence_type: 'annual_date',
    recurrence_config: { month: 12, day_of_month: 24 },
    suggested_hours: { start_time: '08:00', end_time: '17:00' },
    description: 'December 24th - Reduced hours'
  },
  {
    id: 'christmas',
    name: 'Christmas Day',
    category: 'federal',
    recurrence_type: 'annual_date',
    recurrence_config: { month: 12, day_of_month: 25 },
    is_closed: true,
    description: 'December 25th - Typically closed'
  },
  {
    id: 'new-years-eve',
    name: "New Year's Eve",
    category: 'federal',
    recurrence_type: 'annual_date',
    recurrence_config: { month: 12, day_of_month: 31 },
    suggested_hours: { start_time: '08:00', end_time: '17:00' },
    description: 'December 31st - Reduced hours'
  },
  {
    id: 'valentines-day',
    name: "Valentine's Day",
    category: 'custom',
    recurrence_type: 'annual_date',
    recurrence_config: { month: 2, day_of_month: 14 },
    suggested_hours: { start_time: '09:00', end_time: '22:00' },
    description: 'February 14th - Extended hours'
  },
  {
    id: 'mothers-day',
    name: "Mother's Day",
    category: 'custom',
    recurrence_type: 'annual_relative',
    recurrence_config: { month: 5, position: 'second', weekday: 0 },
    suggested_hours: { start_time: '09:00', end_time: '21:00' },
    description: 'Second Sunday of May'
  },
  {
    id: 'fathers-day',
    name: "Father's Day",
    category: 'custom',
    recurrence_type: 'annual_relative',
    recurrence_config: { month: 6, position: 'third', weekday: 0 },
    suggested_hours: { start_time: '09:00', end_time: '21:00' },
    description: 'Third Sunday of June'
  },
  {
    id: 'halloween',
    name: 'Halloween',
    category: 'custom',
    recurrence_type: 'annual_date',
    recurrence_config: { month: 10, day_of_month: 31 },
    suggested_hours: { start_time: '09:00', end_time: '20:00' },
    description: 'October 31st'
  },
  {
    id: 'easter-sunday',
    name: 'Easter Sunday',
    category: 'custom',
    recurrence_type: 'none',
    recurrence_config: {},
    suggested_hours: { start_time: '10:00', end_time: '18:00' },
    description: 'Varies each year - Must set date manually'
  },
  {
    id: 'holiday-season',
    name: 'Holiday Season Extended Hours',
    category: 'seasonal',
    recurrence_type: 'annual_date_range',
    recurrence_config: {
      range_start_date: '2024-11-20',
      range_end_date: '2024-12-31'
    },
    suggested_hours: { start_time: '08:00', end_time: '22:00' },
    description: 'November 20 - December 31 annually'
  },
  {
    id: 'summer-hours',
    name: 'Summer Extended Hours',
    category: 'seasonal',
    recurrence_type: 'annual_date_range',
    recurrence_config: {
      range_start_date: '2024-05-27',
      range_end_date: '2024-09-02'
    },
    suggested_hours: { start_time: '07:00', end_time: '23:00' },
    description: 'Memorial Day - Labor Day annually'
  },
  {
    id: 'back-to-school',
    name: 'Back to School Sale',
    category: 'seasonal',
    recurrence_type: 'annual_date_range',
    recurrence_config: {
      range_start_date: '2024-08-15',
      range_end_date: '2024-09-15'
    },
    suggested_hours: { start_time: '08:00', end_time: '21:00' },
    description: 'August 15 - September 15 annually'
  }
];

export function getTemplatesByCategory(category: 'federal' | 'seasonal' | 'custom'): HolidayTemplate[] {
  return HOLIDAY_TEMPLATES.filter(t => t.category === category);
}

export function searchTemplates(query: string): HolidayTemplate[] {
  const lowerQuery = query.toLowerCase();
  return HOLIDAY_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery)
  );
}

export function getTemplateById(id: string): HolidayTemplate | undefined {
  return HOLIDAY_TEMPLATES.find(t => t.id === id);
}
