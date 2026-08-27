import { ActivityFlag, updateActivityFlag } from '../Activity/activityFlag';
import { applyActivityType } from '../Activity/activityType';

/**
 * Combine the agent-friendly `type` + `isIdea` inputs into the flags bitmask
 * used by the store, starting from any existing flags (so an update preserves
 * unrelated bits). When neither is provided, existing flags are returned
 * unchanged (so optional fields can stay untouched).
 */
export function resolveActivityFlags(
  existingFlags: number | null | undefined,
  typeInput: unknown,
  isIdeaInput: unknown,
): number | undefined {
  if (typeInput === undefined && isIdeaInput === undefined) {
    return existingFlags ?? undefined;
  }
  let flags = existingFlags ?? 0;
  if (typeInput !== undefined) {
    flags = applyActivityType(
      flags,
      typeInput as 'activity' | 'flight' | 'train',
    );
  }
  if (isIdeaInput !== undefined) {
    flags = updateActivityFlag(
      flags,
      ActivityFlag.IsIdea,
      isIdeaInput === true,
    );
  }
  return flags;
}
