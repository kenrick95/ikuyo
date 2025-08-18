export const TaskListStatus = {
  Todo: 0,
  InProgress: 1,
  Done: 2,
  Archived: 3,
  Cancelled: 4,
  Deleted: 5,
};
export type TaskListStatusType = keyof typeof TaskListStatus;
