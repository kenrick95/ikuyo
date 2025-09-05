export const TripViewMode = {
  Timetable: 'Timetable',
  List: 'List',
  Home: 'Home',
} as const;
export type TripViewModeType = (typeof TripViewMode)[keyof typeof TripViewMode];
