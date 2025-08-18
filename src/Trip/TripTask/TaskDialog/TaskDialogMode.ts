export const TaskDialogMode = {
  View: 'view',
  Edit: 'edit',
  Delete: 'delete',
} as const;
export type TaskDialogModeType =
  (typeof TaskDialogMode)[keyof typeof TaskDialogMode];
