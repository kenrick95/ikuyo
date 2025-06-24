export const MacroplanDialogMode = {
  View: 'view',
  Edit: 'edit',
  Delete: 'delete',
} as const;
export type MacroplanDialogModeType =
  (typeof MacroplanDialogMode)[keyof typeof MacroplanDialogMode];
