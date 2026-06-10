import { describe, expect, test } from 'vitest';
import { getTripCardViewTransitionName } from './viewTransition';

describe('getTripCardViewTransitionName', () => {
  test('returns a stable per-trip transition name', () => {
    expect(getTripCardViewTransitionName('trip-123')).toBe(
      'trip-card-trip-123',
    );
  });
});
