export const DateTimePickerMode = {
  Date: 'date',
  DateTime: 'datetime',
} as const;
export type DateTimePickerModeType =
  (typeof DateTimePickerMode)[keyof typeof DateTimePickerMode];
