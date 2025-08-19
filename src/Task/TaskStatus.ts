export const TaskStatus = {
  Todo: 0,
  InProgress: 1,
  Done: 2,
  Archived: 3,
  Cancelled: 4,
  Deleted: 5,
};
export type TaskStatusType = keyof typeof TaskStatus;
