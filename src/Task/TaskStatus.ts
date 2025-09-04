export const TaskStatus = {
  Todo: 0,
  InProgress: 1,
  Done: 2,
  Archived: 3,
  Cancelled: 4,
  Deleted: 5,
} as const;
export type TaskStatusType = keyof typeof TaskStatus;

export function getStatusColor(status: number) {
  switch (status) {
    case TaskStatus.Done:
      return 'green';
    case TaskStatus.InProgress:
      return 'blue';
    case TaskStatus.Cancelled:
      return 'gray';
    case TaskStatus.Archived:
      return 'gray';
    case TaskStatus.Todo:
      return 'amber';
    default:
      return 'orange';
  }
}

export function getStatusLabel(status: number) {
  switch (status) {
    case TaskStatus.Done:
      return 'Done';
    case TaskStatus.InProgress:
      return 'In Progress';
    case TaskStatus.Cancelled:
      return 'Cancelled';
    case TaskStatus.Archived:
      return 'Archived';
    case TaskStatus.Deleted:
      return 'Deleted';
    default:
      return 'To Do';
  }
}
