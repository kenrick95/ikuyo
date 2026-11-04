import { act, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { TripMap } from './TripMap';

const sdk = vi.hoisted(() => ({
  forward: vi.fn(),
  maps: [] as { remove: ReturnType<typeof vi.fn> }[],
}));
vi.mock('@maptiler/sdk', () => ({
  config: {},
  geocoding: { forward: sdk.forward },
  Map: class {
    remove = vi.fn();
    on = vi.fn();
    setStyle = vi.fn();
    isStyleLoaded = vi.fn(() => false);
    constructor() {
      sdk.maps.push(this);
    }
  },
  Marker: class {},
  Popup: class {},
}));
const trip = { region: 'SG', activityIds: [], accommodationIds: [] };
const empty: never[] = [];
vi.mock('../Trip/store/hooks', () => ({
  useCurrentTrip: () => ({ trip, loading: false }),
  useTripActivities: () => empty,
  useTripAccommodations: () => empty,
}));
vi.mock('../theme/hooks', () => ({ useTheme: () => 'light' }));
vi.mock('../Routes/RouteTransition', () => ({
  RouteTransition: ({ children }: { children: ReactNode }) => children,
}));

beforeEach(() => {
  sdk.maps.length = 0;
  sdk.forward.mockReset();
});
function pendingGeocoding() {
  let resolve!: (value: { features: [] }) => void;
  const promise = new Promise<{ features: [] }>((done) => {
    resolve = done;
  });
  return { promise, resolve: () => resolve({ features: [] }) };
}

test('does not create a map after navigating away during geocoding', async () => {
  const pending = pendingGeocoding();
  sdk.forward.mockReturnValue(pending.promise);
  const view = render(<TripMap useCase="map" />);
  expect(sdk.forward).toHaveBeenCalledOnce();
  view.unmount();
  await act(async () => pending.resolve());
  expect(sdk.maps).toHaveLength(0);
});

test('an old geocoding result cannot replace the map from the new view', async () => {
  const oldView = pendingGeocoding();
  const newView = pendingGeocoding();
  sdk.forward
    .mockReturnValueOnce(oldView.promise)
    .mockReturnValueOnce(newView.promise);
  const view = render(<TripMap useCase="home" />);
  view.rerender(<TripMap useCase="map" />);
  await act(async () => newView.resolve());
  expect(sdk.maps).toHaveLength(1);
  await act(async () => oldView.resolve());
  expect(sdk.maps).toHaveLength(1);
  view.unmount();
  expect(sdk.maps[0].remove).toHaveBeenCalledOnce();
});
