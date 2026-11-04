import { Theme } from '@radix-ui/themes';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useBoundStore } from '../data/store';
import type {
  TripSliceAccommodation,
  TripSliceTrip,
} from '../Trip/store/types';
import { TripSharingLevel } from '../Trip/tripSharingLevel';
import { TripUserRole } from '../User/TripUserRole';
import { AccommodationNewDialog } from './AccommodationNewDialog';
import { dbAddAccommodation } from './db';

// Keep the actual Zustand store, dialog, form, date pickers, and Radix Switch.
// Only replace WebGL and external requests.
vi.mock('./AccommodationDialog/AccommodationDialogMap', () => ({
  AccommodationMap: () => <div data-testid="accommodation-map" />,
}));
vi.mock('./AccommodationForm/AccommodationFormGeocoding', () => ({
  geocodingRequest: vi.fn(async () => [103.8, 1.3, 9]),
}));
vi.mock('./db', () => ({
  dbAddAccommodation: vi.fn(async () => ({ undo: vi.fn() })),
  dbUpdateAccommodation: vi.fn(),
}));

const timeZone = 'Asia/Singapore';
function timestamp(day: number, hour = 0) {
  return Temporal.ZonedDateTime.from({
    timeZone,
    year: 2026,
    month: 11,
    day,
    hour,
  }).epochMilliseconds;
}
const trip: TripSliceTrip = {
  id: 'trip',
  title: 'Singapore',
  timestampStart: timestamp(1),
  timestampEnd: timestamp(7),
  timeZone,
  region: 'SG',
  currency: 'SGD',
  originCurrency: 'SGD',
  originRegion: 'SG',
  originTimeZone: timeZone,
  sharingLevel: TripSharingLevel.Private,
  accommodationIds: [],
  activityIds: [],
  macroplanIds: [],
  tripUserIds: [],
  commentGroupIds: [],
  expenseIds: [],
  taskListIds: [],
  currentUserRole: TripUserRole.Owner,
  isCurrentUserTripMember: true,
};
const accommodation: TripSliceAccommodation = {
  id: 'hotel',
  tripId: trip.id,
  name: 'Existing hotel',
  address: '',
  timestampCheckIn: timestamp(1, 15),
  timestampCheckOut: timestamp(2, 11),
  timeZoneCheckIn: timeZone,
  timeZoneCheckOut: timeZone,
  phoneNumber: '',
  notes: '',
  locationLat: null,
  locationLng: null,
  locationZoom: null,
  createdAt: 0,
  lastUpdatedAt: 0,
  commentGroupId: undefined,
};

beforeEach(() => {
  useBoundStore.getState().clearSession();
  vi.clearAllMocks();
});
afterEach(() => {
  useBoundStore.getState().clearSession();
});

test.each([false, true])(
  'opens new accommodation with existing accommodations=%s and keeps the form usable',
  async (existing) => {
    const user = userEvent.setup();
    const selectedTrip = {
      ...trip,
      accommodationIds: existing ? ['hotel'] : [],
    };
    useBoundStore.setState({
      accommodation: existing ? { hotel: accommodation } : {},
    });
    render(
      <Theme>
        <AccommodationNewDialog trip={selectedTrip} />
      </Theme>,
    );

    expect(
      screen.getByRole('dialog', { name: 'New Accommodation' }),
    ).toBeInTheDocument();
    const checkIn = screen.getByRole('button', {
      name: 'Accommodation check in time',
    });
    expect(checkIn).toHaveTextContent(
      existing ? '3 November 2026' : '1 November 2026',
    );
    await user.type(
      screen.getByRole('textbox', { name: /Accommodation name/ }),
      'New hotel',
    );

    // Store updates also happen when the API refreshes the trip or a toast opens.
    act(() => useBoundStore.setState({ tripsLoading: false }));
    expect(
      screen.getByRole('textbox', { name: /Accommodation name/ }),
    ).toHaveValue('New hotel');
    const coordinates = screen.getByRole('switch', {
      name: 'Set location coordinates',
    });
    await user.click(coordinates);
    expect(coordinates).toBeChecked();
    expect(screen.getByTestId('accommodation-map')).toBeInTheDocument();
    await user.click(coordinates);
    expect(coordinates).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(dbAddAccommodation).toHaveBeenCalledOnce());
    expect(dbAddAccommodation).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New hotel',
        timestampCheckIn: timestamp(existing ? 3 : 1, 15),
        locationLat: null,
        locationLng: null,
      }),
      { tripId: trip.id },
    );
  },
);

test('opens a new accommodation prefilled from a timetable day', () => {
  render(
    <Theme>
      <AccommodationNewDialog trip={trip} prefillData={{ dayOfTrip: 4 }} />
    </Theme>,
  );
  expect(
    screen.getByRole('button', { name: 'Accommodation check in time' }),
  ).toHaveTextContent('4 November 2026');
});
