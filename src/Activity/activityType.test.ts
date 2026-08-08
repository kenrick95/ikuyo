import { describe, expect, test } from 'vitest';
import { ActivityFlag } from './activityFlag';
import {
  ActivityType,
  ActivityTypeLabel,
  getActivityType,
  getActivityTypeLabel,
} from './activityType';

describe('getActivityType', () => {
  test('flight flag wins over train and activity', () => {
    expect(getActivityType(ActivityFlag.IsFlight | ActivityFlag.IsTrain)).toBe(
      ActivityType.Flight,
    );
  });

  test('train flag maps to train', () => {
    expect(getActivityType(ActivityFlag.IsTrain)).toBe(ActivityType.Train);
  });

  test('no type flag maps to activity', () => {
    expect(getActivityType(undefined)).toBe(ActivityType.Activity);
    expect(getActivityType(0)).toBe(ActivityType.Activity);
    expect(getActivityType(ActivityFlag.IsIdea)).toBe(ActivityType.Activity);
  });
});

describe('getActivityTypeLabel', () => {
  test('returns plain type label without idea flag', () => {
    expect(getActivityTypeLabel(undefined)).toBe(
      ActivityTypeLabel[ActivityType.Activity],
    );
    expect(getActivityTypeLabel(0)).toBe(
      ActivityTypeLabel[ActivityType.Activity],
    );
    expect(getActivityTypeLabel(ActivityFlag.IsFlight)).toBe(
      ActivityTypeLabel[ActivityType.Flight],
    );
    expect(getActivityTypeLabel(ActivityFlag.IsTrain)).toBe(
      ActivityTypeLabel[ActivityType.Train],
    );
  });

  test('appends " Idea" for each idea combination', () => {
    expect(getActivityTypeLabel(ActivityFlag.IsIdea)).toBe('Activity Idea');
    expect(
      getActivityTypeLabel(ActivityFlag.IsIdea | ActivityFlag.IsFlight),
    ).toBe('Flight Idea');
    expect(
      getActivityTypeLabel(ActivityFlag.IsIdea | ActivityFlag.IsTrain),
    ).toBe('Train Journey Idea');
  });
});
