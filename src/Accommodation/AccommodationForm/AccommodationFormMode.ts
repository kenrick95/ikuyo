export const AccommodationFormMode = {
  New: 'new',
  Edit: 'edit',
} as const;
export type AccommodationFormModeType =
  (typeof AccommodationFormMode)[keyof typeof AccommodationFormMode];
