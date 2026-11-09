import { Theme } from '@radix-ui/themes';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ComponentProps, useState } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ActivityMap } from '../ActivityDialog/ActivityDialogMap';
import { dbAddActivity, dbUpdateActivity } from '../db';
import { ActivityForm } from './ActivityForm';
import { geocodingRequest } from './ActivityFormGeocoding';
import { ActivityFormMode } from './ActivityFormMode';

vi.mock('../../data/store', () => ({
  useBoundStore: (selector: (state: unknown) => unknown) =>
    selector({
      publishToast: vi.fn(),
      resetToast: vi.fn(),
      setTripLocalState: vi.fn(),
    }),
}));
vi.mock('../db', () => ({
  dbAddActivity: vi.fn(),
  dbUpdateActivity: vi.fn(),
}));
vi.mock('./ActivityFormGeocoding', () => ({
  geocodingRequest: vi.fn(),
}));
vi.mock('../ActivityDialog/ActivityDialogMap', () => ({
  ActivityMap: ({ mapOptions, marker }: ComponentProps<typeof ActivityMap>) => {
    // The real map initializes its viewport only on mount.
    const [initialPosition] = useState({ mapOptions, marker });
    return (
      <div
        data-testid="activity-map"
        data-position={JSON.stringify(initialPosition)}
      />
    );
  },
}));

const baseProps: ComponentProps<typeof ActivityForm> = {
  mode: ActivityFormMode.New,
  tripId: 'trip-1',
  tripStartDateTime: undefined,
  tripEndDateTime: undefined,
  tripTimeZone: 'UTC',
  tripRegion: 'US',
  activityTitle: 'Travel',
  activityStartDateTime: undefined,
  activityEndDateTime: undefined,
  activityStartTimeZone: 'UTC',
  activityEndTimeZone: 'UTC',
  activityLocation: 'Origin',
  activityLocationLat: 0,
  activityLocationLng: 10,
  activityLocationZoom: 11,
  activityLocationDestination: 'Destination',
  activityLocationDestinationLat: 20,
  activityLocationDestinationLng: 0,
  activityLocationDestinationZoom: 12,
  activityDescription: '',
  activityFlags: 0,
  onFormSuccess: vi.fn(),
  onFormCancel: vi.fn(),
};

function renderForm(props: Partial<typeof baseProps> = {}) {
  return render(
    <Theme>
      <ActivityForm {...baseProps} {...props} />
    </Theme>,
  );
}

function mapPositions() {
  return screen
    .queryAllByTestId('activity-map')
    .map((map) => JSON.parse(map.getAttribute('data-position') ?? '{}'));
}

const swapButton = () =>
  screen.getByRole('button', { name: 'Swap origin and destination' });

describe('ActivityForm location swap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dbAddActivity).mockResolvedValue({
      id: 'new-activity',
      transaction: { id: 'new-activity' },
      undo: vi.fn(),
    });
    vi.mocked(dbUpdateActivity).mockImplementation(async (activity) => ({
      transaction: {
        ...activity,
        createdAt: 0,
        lastUpdatedAt: 0,
        trip: undefined,
      },
      undo: async () => undefined,
    }));
    vi.mocked(geocodingRequest).mockResolvedValue([30, 40, 9]);
  });

  test.each([ActivityFormMode.New, ActivityFormMode.Edit])(
    'swaps current names, coordinates and zoom when saving in %s mode',
    async (mode) => {
      const user = userEvent.setup();
      renderForm({ mode, activityId: 'activity-1' });
      await user.clear(screen.getByLabelText('Origin'));
      await user.type(screen.getByLabelText('Origin'), 'Edited origin');
      await user.click(swapButton());

      expect(screen.getByLabelText('Origin')).toHaveValue('Destination');
      expect(screen.getByLabelText('Destination')).toHaveValue('Edited origin');
      expect(mapPositions()).toEqual([
        {
          mapOptions: { lng: 0, lat: 20, zoom: 12, region: 'US' },
          marker: { lng: 0, lat: 20 },
        },
        {
          mapOptions: { lng: 10, lat: 0, zoom: 11, region: 'US' },
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
        location: 'Destination',
        locationLat: 20,
        locationLng: 0,
        locationZoom: 12,
        locationDestination: 'Edited origin',
        locationDestinationLat: 0,
        locationDestinationLng: 10,
        locationDestinationZoom: 11,
      });
    },
  );

  test('swaps an empty location and disabled coordinates, and restores them on a second swap', async () => {
    const user = userEvent.setup();
    renderForm({
      activityLocationDestination: '',
      activityLocationDestinationLat: null,
      activityLocationDestinationLng: null,
    });
    expect(
      screen.queryByRole('button', { name: 'Swap origin and destination' }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('switch', {
        name: 'Set two locations (origin & destination)?',
      }),
    );
    await user.click(swapButton());
    expect(screen.getByLabelText('Origin')).toHaveValue('');
    expect(screen.getByLabelText('Destination')).toHaveValue('Origin');
    expect(
      screen.getByRole('switch', { name: 'Set origin location coordinates' }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('switch', {
        name: 'Set destination location coordinates',
      }),
    ).toBeChecked();
    expect(mapPositions()).toHaveLength(1);

    await user.click(swapButton());
    expect(screen.getByLabelText('Origin')).toHaveValue('Origin');
    expect(screen.getByLabelText('Destination')).toHaveValue('');
    expect(
      screen.getByRole('switch', { name: 'Set origin location coordinates' }),
    ).toBeChecked();
    expect(
      screen.getByRole('switch', {
        name: 'Set destination location coordinates',
      }),
    ).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(dbAddActivity).toHaveBeenCalled());
    expect(vi.mocked(dbAddActivity).mock.calls[0][0]).toMatchObject({
      location: 'Origin',
      locationLat: 0,
      locationLng: 10,
      locationZoom: 11,
      locationDestination: '',
      locationDestinationLat: null,
      locationDestinationLng: null,
      locationDestinationZoom: null,
    });
  });

  test('ignores geocoding results requested before a swap', async () => {
    let resolveGeocoding!: (result: [number, number, number]) => void;
    vi.mocked(geocodingRequest).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveGeocoding = resolve;
      }),
    );
    const user = userEvent.setup();
    renderForm({ activityLocationLat: null, activityLocationLng: null });
    await user.click(
      screen.getByRole('switch', { name: 'Set origin location coordinates' }),
    );
    await user.click(swapButton());
    await act(async () => resolveGeocoding([30, 40, 9]));
    expect(
      screen.getByRole('switch', { name: 'Set origin location coordinates' }),
    ).toBeChecked();
    expect(
      screen.getByRole('switch', {
        name: 'Set destination location coordinates',
      }),
    ).not.toBeChecked();
    expect(mapPositions()[0].marker).toEqual({ lng: 0, lat: 20 });
  });
});
