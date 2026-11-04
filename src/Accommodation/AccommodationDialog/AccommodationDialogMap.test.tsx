import { render } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { AccommodationMap } from './AccommodationDialogMap';

const sdk = vi.hoisted(() => ({
  maps: [] as { remove: ReturnType<typeof vi.fn> }[],
  markers: [] as { remove: ReturnType<typeof vi.fn> }[],
}));
vi.mock('@maptiler/sdk', () => ({
  config: {},
  Map: class {
    remove = vi.fn();
    on = vi.fn();
    setStyle = vi.fn();
    setZoom = vi.fn();
    addControl = vi.fn();
    constructor() {
      sdk.maps.push(this);
    }
  },
  Marker: class {
    remove = vi.fn();
    setLngLat = vi.fn(() => this);
    addTo = vi.fn(() => this);
    on = vi.fn(() => this);
    constructor() {
      sdk.markers.push(this);
    }
  },
}));
vi.mock('@maptiler/geocoding-control/maptilersdk', () => ({
  GeocodingControl: class {
    on = vi.fn();
  },
}));
vi.mock('../../theme/hooks', () => ({ useTheme: () => 'light' }));

beforeEach(() => {
  sdk.maps.length = 0;
  sdk.markers.length = 0;
});

function map() {
  return (
    <AccommodationMap
      mapOptions={{ lng: 103.8, lat: 1.3, zoom: 9 }}
      marker={{ lng: 103.8, lat: 1.3 }}
    />
  );
}

test('releases maps and markers on repeated close or coordinate disable', () => {
  for (let i = 0; i < 3; i++) {
    const view = render(map());
    view.rerender(map()); // Fresh inline options must not recreate the map.
    expect(sdk.maps).toHaveLength(i + 1);
    view.unmount();
    expect(sdk.maps[i].remove).toHaveBeenCalledOnce();
    expect(sdk.markers[i].remove).toHaveBeenCalledOnce();
  }
});

test('releases every map during StrictMode effect replay and unmount', () => {
  const view = render(<StrictMode>{map()}</StrictMode>);
  expect(
    sdk.maps.filter((instance) => instance.remove.mock.calls.length === 0),
  ).toHaveLength(1);
  view.unmount();
  for (const instance of [...sdk.maps, ...sdk.markers]) {
    expect(instance.remove).toHaveBeenCalledOnce();
  }
});
