import { Theme } from '@radix-ui/themes';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ComponentProps, useState } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ActivityMap } from '../ActivityDialog/ActivityDialogMap';
import { ActivityFlag } from '../activityFlag';
import { dbAddActivity, dbUpdateActivity } from '../db';
import { FlightForm } from '../FlightForm/FlightForm';
import { airportGeocodingRequest } from '../FlightForm/FlightFormGeocoding';
import { TrainForm } from '../TrainForm/TrainForm';
import { stationGeocodingRequest } from '../TrainForm/TrainFormGeocoding';
import { ActivityFormMode } from './ActivityFormMode';

vi.mock('../../data/store', () => ({
  useBoundStore: (selector: (state: unknown) => unknown) =>
    selector({
      publishToast: vi.fn(),
      setTripLocalState: vi.fn(),
    }),
}));
vi.mock('../db', () => ({ dbAddActivity: vi.fn(), dbUpdateActivity: vi.fn() }));
vi.mock('../FlightForm/FlightFormGeocoding', () => ({
  airportGeocodingRequest: vi.fn(),
}));
vi.mock('../TrainForm/TrainFormGeocoding', () => ({
  stationGeocodingRequest: vi.fn(),
}));
vi.mock('../ActivityDialog/ActivityDialogMap', () => ({
  ActivityMap: ({ mapOptions, marker }: ComponentProps<typeof ActivityMap>) => {
    // Verify remounting: the real map initializes its viewport only on mount.
    const [initialPosition] = useState({ mapOptions, marker });
    return (
      <div
        data-testid="activity-map"
        data-position={JSON.stringify(initialPosition)}
      />
    );
  },
}));

const baseProps: ComponentProps<typeof FlightForm> = {
  mode: ActivityFormMode.New,
  tripId: 'trip-1',
  activityId: 'activity-1',
  tripStartDateTime: undefined,
  tripEndDateTime: undefined,
  tripTimeZone: 'UTC',
  tripRegion: 'JP',
  activityTitle: 'Service 123',
  activityStartDateTime: Temporal.PlainDateTime.from('2026-11-09T10:00'),
  activityEndDateTime: Temporal.PlainDateTime.from('2026-11-09T12:00'),
  activityStartTimeZone: 'UTC',
  activityEndTimeZone: 'UTC',
  activityLocation: 'Departure',
  activityLocationLat: 0,
  activityLocationLng: 10,
  activityLocationZoom: 11,
  activityLocationDestination: 'Arrival',
  activityLocationDestinationLat: 20,
  activityLocationDestinationLng: 0,
  activityLocationDestinationZoom: 12,
  activityDescription: '',
  activityFlags: 0,
  onFormSuccess: vi.fn(),
  onFormCancel: vi.fn(),
};
const swap = () =>
  screen.getByRole('button', { name: 'Swap origin and destination' });
const departure = () =>
  screen.getByRole('textbox', {
    name: /^(From — departure airport|Departure station)/,
  });
const arrival = () =>
  screen.getByRole('textbox', {
    name: /^(To — arrival airport|Arrival station)/,
  });
const departureToggle = () =>
  screen.getByRole('switch', { name: /Set departure .* coordinates/ });
const arrivalToggle = () =>
  screen.getByRole('switch', { name: /Set arrival .* coordinates/ });
const mapPositions = () =>
  screen
    .queryAllByTestId('activity-map')
    .map((map) => JSON.parse(map.getAttribute('data-position') ?? '{}'));

describe.each([
  {
    name: 'flight',
    Form: FlightForm,
    geocode: airportGeocodingRequest,
    flag: ActivityFlag.IsFlight,
  },
  {
    name: 'train',
    Form: TrainForm,
    geocode: stationGeocodingRequest,
    flag: ActivityFlag.IsTrain,
  },
])('$name location swap', ({ Form, geocode, flag }) => {
  function renderForm(props: Partial<typeof baseProps> = {}) {
    render(
      <Theme>
        <Form {...baseProps} {...props} />
      </Theme>,
    );
  }
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(geocode).mockResolvedValue([30, 40, 9]);
  });

  test.each([ActivityFormMode.New, ActivityFormMode.Edit])(
    'saves swapped locations and maps in %s mode, preserving schedule and type',
    async (mode) => {
      const user = userEvent.setup();
      renderForm({
        mode,
        activityStartTimeZone: 'Asia/Tokyo',
        activityEndTimeZone: 'Asia/Shanghai',
      });
      await user.clear(departure());
      await user.type(departure(), 'Edited departure');
      await user.click(swap());
      expect(departure()).toHaveValue('Arrival');
      expect(arrival()).toHaveValue('Edited departure');
      expect(mapPositions()).toEqual([
        {
          mapOptions: { lng: 0, lat: 20, zoom: 12 },
          marker: { lng: 0, lat: 20 },
        },
        {
          mapOptions: { lng: 10, lat: 0, zoom: 11 },
          marker: { lng: 10, lat: 0 },
        },
      ]);
      expect(dbAddActivity).not.toHaveBeenCalled();
      expect(dbUpdateActivity).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: 'Save' }));
      const save =
        mode === ActivityFormMode.New
          ? vi.mocked(dbAddActivity)
          : vi.mocked(dbUpdateActivity);
      await waitFor(() => expect(save).toHaveBeenCalled());
      expect(save.mock.calls[0][0]).toMatchObject({
        location: 'Arrival',
        locationLat: 20,
        locationLng: 0,
        locationZoom: 12,
        locationDestination: 'Edited departure',
        locationDestinationLat: 0,
        locationDestinationLng: 10,
        locationDestinationZoom: 11,
        timestampStart:
          Temporal.Instant.from('2026-11-09T01:00Z').epochMilliseconds,
        timestampEnd:
          Temporal.Instant.from('2026-11-09T04:00Z').epochMilliseconds,
        timeZoneStart: 'Asia/Tokyo',
        timeZoneEnd: 'Asia/Shanghai',
        flags: flag,
      });
    },
  );

  test('swaps empty fields and disabled coordinate toggles, and reverses the swap', async () => {
    const user = userEvent.setup();
    renderForm({
      activityLocationDestination: '',
      activityLocationDestinationLat: null,
      activityLocationDestinationLng: null,
    });
    await user.click(swap());
    expect(departure()).toHaveValue('');
    expect(arrival()).toHaveValue('Departure');
    expect(departureToggle()).not.toBeChecked();
    expect(arrivalToggle()).toBeChecked();
    expect(mapPositions()).toHaveLength(1);
    await user.click(swap());
    expect(departure()).toHaveValue('Departure');
    expect(arrival()).toHaveValue('');
    expect(departureToggle()).toBeChecked();
    expect(arrivalToggle()).not.toBeChecked();
  });

  test('retains disabled coordinates across a swap, including zero values', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(departureToggle());
    await user.click(swap());
    expect(departureToggle()).toBeChecked();
    expect(arrivalToggle()).not.toBeChecked();
    await user.click(arrivalToggle());
    expect(geocode).not.toHaveBeenCalled();
    expect(mapPositions()[1]).toEqual({
      mapOptions: { lng: 10, lat: 0, zoom: 11 },
      marker: { lng: 10, lat: 0 },
    });
  });

  test('ignores geocoding requested before a swap', async () => {
    let resolveGeocoding!: (result: [number, number, number]) => void;
    vi.mocked(geocode).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveGeocoding = resolve;
      }),
    );
    const user = userEvent.setup();
    renderForm({ activityLocationLat: null, activityLocationLng: null });
    await user.click(departureToggle());
    await user.click(swap());
    await act(async () => resolveGeocoding([30, 40, 9]));
    expect(departureToggle()).toBeChecked();
    expect(arrivalToggle()).not.toBeChecked();
    expect(mapPositions()[0].marker).toEqual({ lng: 0, lat: 20 });
  });
});
