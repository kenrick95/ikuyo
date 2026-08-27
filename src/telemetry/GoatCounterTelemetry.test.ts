import { describe, expect, test } from 'vitest';
import { pageCategory } from './GoatCounterTelemetry';

describe('pageCategory', () => {
  test('does not include trip or entity ids', () => {
    expect(
      pageCategory('/trip/trip-secret/timetable/activity/activity-secret'),
    ).toBe('trip-timetable-activity');
    expect(pageCategory('/trip/trip-secret/list?dialog=activity-secret')).toBe(
      'trip-list',
    );
  });

  test('uses fixed categories for public pages', () => {
    expect(pageCategory('/landing')).toBe('landing');
    expect(pageCategory('/trip')).toBe('trips');
    expect(pageCategory('/account/edit')).toBe('account-edit');
    expect(pageCategory('/unknown/path')).toBe('other');
  });
});
