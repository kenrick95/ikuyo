export const ActivityDialogMode = {
  View: 'view',
  Edit: 'edit',
  Delete: 'delete',
} as const;
export type ActivityDialogModeType =
  (typeof ActivityDialogMode)[keyof typeof ActivityDialogMode];
