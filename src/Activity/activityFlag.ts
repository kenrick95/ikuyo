export const ActivityFlag = {
  // NOTE: Start from 2 (1 << 1) to avoid confusion with falsy 0 and truthy 1
  IsIdea: 2 as const, // 1 << 1
};
export type ActivityFlagType = (typeof ActivityFlag)[keyof typeof ActivityFlag];

/**
 * @param activityFlags activity.flags
 * @param flag import from ActivityFlag
 */
export function hasActivityFlag(
  activityFlags: number | null | undefined,
  flag: ActivityFlagType,
): boolean {
  if (!activityFlags) {
    return false;
  }
  return (activityFlags & flag) === flag;
}

export function addActivityFlag(
  activityFlags: number | null | undefined,
  flag: ActivityFlagType,
) {
  const currentFlags = activityFlags ?? 0;
  return currentFlags | flag;
}

export function removeActivityFlag(
  activityFlags: number | null | undefined,
  flag: ActivityFlagType,
) {
  const currentFlags = activityFlags ?? 0;
  return currentFlags & ~flag;
}

export function updateActivityFlag(
  activityFlags: number | null | undefined,
  flag: ActivityFlagType,
  enabled: boolean,
) {
  if (enabled) {
    return addActivityFlag(activityFlags, flag);
  } else {
    return removeActivityFlag(activityFlags, flag);
  }
}
