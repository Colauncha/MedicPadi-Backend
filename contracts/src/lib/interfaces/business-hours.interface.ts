export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';
export type HoursType = Date | number | 'closed';

export type BusinessHours = {
  [key in DayOfWeek]?: { start: HoursType; end: HoursType };
};
