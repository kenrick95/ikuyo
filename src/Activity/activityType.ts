import {
  ActivityFlag,
  addActivityFlag,
  hasActivityFlag,
  removeActivityFlag,
} from './activityFlag';

export const ActivityType = {
  Activity: 'activity',
  Flight: 'flight',
  Train: 'train',
} as const;
export type ActivityTypeType = (typeof ActivityType)[keyof typeof ActivityType];

/**
 * Derives the activity type from the flags bitmask.
 * Priority: Flight > Train > Activity (generic fallback).
 */
export function getActivityType(
  flags: number | null | undefined,
): ActivityTypeType {
  if (hasActivityFlag(flags, ActivityFlag.IsFlight)) {
    return ActivityType.Flight;
  }
  if (hasActivityFlag(flags, ActivityFlag.IsTrain)) {
    return ActivityType.Train;
  }
  return ActivityType.Activity;
}

/**
 * Returns a new flags value with all type-specific bits cleared and the
 * bit(s) for the given type set. Non-type flags (e.g. IsIdea) are preserved.
 */
export function applyActivityType(
  flags: number | null | undefined,
  type: ActivityTypeType,
): number {
  // Clear all type flags first
  let result = removeActivityFlag(flags, ActivityFlag.IsFlight);
  result = removeActivityFlag(result, ActivityFlag.IsTrain);

  if (type === ActivityType.Flight) {
    result = addActivityFlag(result, ActivityFlag.IsFlight);
  }
  if (type === ActivityType.Train) {
    result = addActivityFlag(result, ActivityFlag.IsTrain);
  }

  return result;
}

/** Human-readable label for each activity type. */
export const ActivityTypeLabel: Record<ActivityTypeType, string> = {
  [ActivityType.Activity]: 'Activity',
  [ActivityType.Flight]: 'Flight',
  [ActivityType.Train]: 'Train Journey',
};

/**
 * Human-readable display label for an activity's flags, e.g. "Flight",
 * "Train Journey", "Activity Idea", "Flight Idea" or "Train Journey Idea".
 * Adds an " Idea" suffix when the IsIdea flag is set.
 */
export function getActivityTypeLabel(flags: number | null | undefined): string {
  const base = ActivityTypeLabel[getActivityType(flags)];
  return hasActivityFlag(flags, ActivityFlag.IsIdea) ? `${base} Idea` : base;
}
