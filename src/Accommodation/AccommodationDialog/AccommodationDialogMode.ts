export const AccommodationDialogMode = {
  View: 'view',
  Edit: 'edit',
  Delete: 'delete',
} as const;
export type AccommodationDialogModeType =
  (typeof AccommodationDialogMode)[keyof typeof AccommodationDialogMode];
