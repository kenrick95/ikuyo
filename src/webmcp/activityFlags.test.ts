import { describe, expect, test } from 'vitest';
import { ActivityFlag } from '../Activity/activityFlag';
import { resolveActivityFlags } from './activityFlags';

describe('WebMCP resolveActivityFlags', () => {
  test('flight type sets the IsFlight bit', () => {
    const flags = resolveActivityFlags(undefined, 'flight', undefined);
    expect(flags).toBe(ActivityFlag.IsFlight);
  });

  test('train type sets the IsTrain bit', () => {
    const flags = resolveActivityFlags(undefined, 'train', undefined);
    expect(flags).toBe(ActivityFlag.IsTrain);
  });

  test('activity type clears flight/train but keeps other flags', () => {
    const flags = resolveActivityFlags(
      ActivityFlag.IsIdea,
      'activity',
      undefined,
    );
    expect(flags).toBe(ActivityFlag.IsIdea);
  });

  test('isIdea true adds the IsIdea bit alongside a transport type', () => {
    const flags = resolveActivityFlags(undefined, 'train', true);
    expect(flags).toBe(ActivityFlag.IsTrain | ActivityFlag.IsIdea);
  });

  test('isIdea false clears the IsIdea bit', () => {
    const flags = resolveActivityFlags(ActivityFlag.IsIdea, undefined, false);
    expect(flags).toBe(0);
  });

  test('unchanged when neither type nor idea is provided', () => {
    expect(resolveActivityFlags(5, undefined, undefined)).toBe(5);
    expect(
      resolveActivityFlags(undefined, undefined, undefined),
    ).toBeUndefined();
  });
});
