import {
  ActivityFlag,
  addActivityFlag,
  hasActivityFlag,
  removeActivityFlag,
} from './activityFlag';

export const ActivityType = {
  Activity: 'activity',
  Flight: 'flight',
} as const;
export type ActivityTypeType = (typeof ActivityType)[keyof typeof ActivityType];

/**
 * Derives the activity type from the flags bitmask.
 * Priority: Flight > Activity (generic fallback).
 */
export function getActivityType(
  flags: number | null | undefined,
): ActivityTypeType {
  if (hasActivityFlag(flags, ActivityFlag.IsFlight)) {
    return ActivityType.Flight;
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

  if (type === ActivityType.Flight) {
    result = addActivityFlag(result, ActivityFlag.IsFlight);
  }

  return result;
}

/** Human-readable label for each activity type. */
export const ActivityTypeLabel: Record<ActivityTypeType, string> = {
  [ActivityType.Activity]: 'Activity',
  [ActivityType.Flight]: 'Flight',
};
