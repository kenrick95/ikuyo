export const TaskFormMode = {
  New: 'new',
  Edit: 'edit',
} as const;
export type TaskFormModeType = (typeof TaskFormMode)[keyof typeof TaskFormMode];
