import { Theme } from '@radix-ui/themes';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ActivityNewDialog } from '../Activity/ActivityNewDialog';
import { FlightNewDialog } from '../Activity/FlightNewDialog';
import { TrainNewDialog } from '../Activity/TrainNewDialog';
import { useBoundStore } from '../data/store';
import { MacroplanNewDialog } from '../Macroplan/MacroplanNewDialog';
import { TripUserRole } from '../User/TripUserRole';
import type { TripSliceTrip } from './store/types';
import { TripSharingLevel } from './tripSharingLevel';

vi.mock('../Activity/ActivityDialog/ActivityDialogMap', () => ({
  ActivityMap: () => null,
}));
vi.mock('../Activity/ActivityForm/ActivityFormGeocoding', () => ({
  geocodingRequest: vi.fn(),
}));
vi.mock('../Activity/FlightForm/FlightFormGeocoding', () => ({
  airportGeocodingRequest: vi.fn(),
}));
vi.mock('../Activity/TrainForm/TrainFormGeocoding', () => ({
  stationGeocodingRequest: vi.fn(),
}));

const trip: TripSliceTrip = {
  id: 'trip',
  title: 'Trip',
  timeZone: 'Asia/Singapore',
  timestampStart: Date.UTC(2026, 10, 1),
  timestampEnd: Date.UTC(2026, 10, 7),
  region: 'SG',
  currency: 'SGD',
  originCurrency: 'SGD',
  originRegion: 'SG',
  originTimeZone: 'Asia/Singapore',
  sharingLevel: TripSharingLevel.Private,
  currentUserRole: TripUserRole.Owner,
  isCurrentUserTripMember: true,
  accommodationIds: [],
  activityIds: [],
  macroplanIds: [],
  expenseIds: [],
  tripUserIds: [],
  commentGroupIds: [],
  taskListIds: [],
};
beforeEach(() => useBoundStore.getState().clearSession());
afterEach(() => useBoundStore.getState().clearSession());

test.each([
  ['New Activity', ActivityNewDialog],
  ['New Flight', FlightNewDialog],
  ['New Train Journey', TrainNewDialog],
  ['New Day Plan', MacroplanNewDialog],
] as const)('%s opens and survives local state updates', (title, Component) => {
  const prefillData = { dayOfTrip: 2, timeStart: '0900' };
  const view = render(
    <Theme>
      <Component trip={trip} />
    </Theme>,
  );
  expect(screen.getByRole('dialog', { name: title })).toBeInTheDocument();
  act(() =>
    useBoundStore.getState().setTripLocalState(trip.id, {
      activityTimestampStart: trip.timestampStart + 3600000,
    }),
  );
  expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  view.unmount();
  render(
    <Theme>
      <Component trip={trip} prefillData={prefillData} />
    </Theme>,
  );
  expect(screen.getByRole('dialog', { name: title })).toBeInTheDocument();
});
