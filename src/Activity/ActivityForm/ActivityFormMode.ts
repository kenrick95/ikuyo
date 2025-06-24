export const ActivityFormMode = {
  New: 'new',
  Edit: 'edit',
} as const;
export type ActivityFormModeType =
  (typeof ActivityFormMode)[keyof typeof ActivityFormMode];
