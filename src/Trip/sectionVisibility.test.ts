import { describe, expect, test } from 'vitest';
import { TripUserRole } from '../User/TripUserRole';
import { getSectionVisibility } from './sectionVisibility';
import type { TripSliceTrip } from './store/types';

function makeTrip(overrides: Partial<TripSliceTrip>): TripSliceTrip {
  return {
    id: 't1',
    title: 'Test',
    timestampStart: 0,
    timestampEnd: 0,
    currency: 'USD',
    region: 'US',
    originCurrency: 'USD',
    timeZone: 'UTC',
    sharingLevel: 2,
    accommodationIds: [],
    activityIds: [],
    macroplanIds: [],
    tripUserIds: [],
    commentGroupIds: [],
    expenseIds: [],
    taskListIds: [],
    currentUserRole: TripUserRole.Viewer,
    isCurrentUserTripMember: false,
    ...overrides,
  } as TripSliceTrip;
}

describe('getSectionVisibility', () => {
  test('Owner always sees everything', () => {
    const trip = makeTrip({
      currentUserRole: TripUserRole.Owner,
      isCurrentUserTripMember: true,
      publicShowExpenses: false,
      publicShowTasks: false,
      publicShowComments: false,
      viewerShowExpenses: false,
      viewerShowTasks: false,
      viewerShowComments: false,
    });
    expect(getSectionVisibility(trip)).toEqual({
      expenses: true,
      tasks: true,
      comments: true,
    });
  });

  test('Editor always sees everything', () => {
    const trip = makeTrip({
      currentUserRole: TripUserRole.Editor,
      isCurrentUserTripMember: true,
      publicShowExpenses: false,
      viewerShowExpenses: false,
    });
    expect(getSectionVisibility(trip)).toEqual({
      expenses: true,
      tasks: true,
      comments: true,
    });
  });

  test('Non-member visitor: undefined fields → all visible (safe default)', () => {
    const trip = makeTrip({
      currentUserRole: TripUserRole.Viewer,
      isCurrentUserTripMember: false,
    });
    expect(getSectionVisibility(trip)).toEqual({
      expenses: true,
      tasks: true,
      comments: true,
    });
  });

  test('Non-member visitor: false fields → hidden', () => {
    const trip = makeTrip({
      currentUserRole: TripUserRole.Viewer,
      isCurrentUserTripMember: false,
      publicShowExpenses: false,
      publicShowTasks: false,
      publicShowComments: false,
    });
    expect(getSectionVisibility(trip)).toEqual({
      expenses: false,
      tasks: false,
      comments: false,
    });
  });

  test('Non-member visitor: true fields → visible', () => {
    const trip = makeTrip({
      currentUserRole: TripUserRole.Viewer,
      isCurrentUserTripMember: false,
      publicShowExpenses: true,
      publicShowTasks: true,
      publicShowComments: true,
    });
    expect(getSectionVisibility(trip)).toEqual({
      expenses: true,
      tasks: true,
      comments: true,
    });
  });

  test('Non-member visitor: mixed fields', () => {
    const trip = makeTrip({
      currentUserRole: TripUserRole.Viewer,
      isCurrentUserTripMember: false,
      publicShowExpenses: false,
      publicShowTasks: true,
    });
    const result = getSectionVisibility(trip);
    expect(result.expenses).toBe(false);
    expect(result.tasks).toBe(true);
    expect(result.comments).toBe(true); // undefined → visible
  });

  test('Invited Viewer: uses viewerShow* not publicShow*', () => {
    const trip = makeTrip({
      currentUserRole: TripUserRole.Viewer,
      isCurrentUserTripMember: true,
      publicShowExpenses: false, // would hide if non-member
      viewerShowExpenses: true, // but viewer override allows it
    });
    expect(getSectionVisibility(trip).expenses).toBe(true);
  });

  test('Invited Viewer: false viewerShow* → hidden', () => {
    const trip = makeTrip({
      currentUserRole: TripUserRole.Viewer,
      isCurrentUserTripMember: true,
      publicShowExpenses: true, // would show if non-member
      viewerShowExpenses: false, // but viewer sees it hidden
    });
    expect(getSectionVisibility(trip).expenses).toBe(false);
  });

  test('Invited Viewer: undefined viewerShow* → visible (safe default)', () => {
    const trip = makeTrip({
      currentUserRole: TripUserRole.Viewer,
      isCurrentUserTripMember: true,
    });
    expect(getSectionVisibility(trip)).toEqual({
      expenses: true,
      tasks: true,
      comments: true,
    });
  });
});
