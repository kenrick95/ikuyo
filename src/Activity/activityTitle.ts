/**
 * Returns the display title for an activity, prepending the emoji icon if set.
 */
export function getActivityDisplayTitle(activity: {
  title: string;
  icon?: string | null | undefined;
}): string {
  return activity.icon ? `${activity.icon} ${activity.title}` : activity.title;
}
