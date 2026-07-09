export const ActivityDialogMode = {
  View: 'view',
  Edit: 'edit',
  Delete: 'delete',
  Duplicate: 'duplicate',
} as const;
export type ActivityDialogModeType =
  (typeof ActivityDialogMode)[keyof typeof ActivityDialogMode];
