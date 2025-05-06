export const TripViewMode = {
  Timetable: 'Timetable',
  List: 'List',
} as const;
export type TripViewModeType = (typeof TripViewMode)[keyof typeof TripViewMode];
