import { act, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../data/apiClient';
import type { TripSliceTrip } from './store/types';
import { TripStructuredData } from './TripStructuredData';

vi.mock('../data/apiClient', () => ({ apiRequest: vi.fn() }));
const snapshots = vi.hoisted(() => ({
  activities: [] as unknown[],
  accommodations: [] as unknown[],
}));
vi.mock('../data/store', () => ({
  useDeepBoundStore: (
    selector: (state: {
      getActivities: () => unknown[];
      getAccommodations: () => unknown[];
    }) => unknown,
  ) =>
    selector({
      getActivities: () => snapshots.activities,
      getAccommodations: () => snapshots.accommodations,
    }),
}));

const trip = (id: string) =>
  ({ id, activityIds: [], accommodationIds: [] }) as unknown as TripSliceTrip;
const script = () => document.getElementById('ikuyo-page-jsonld');

afterEach(() => {
  script()?.remove();
  vi.resetAllMocks();
  snapshots.activities = [];
  snapshots.accommodations = [];
});

describe('TripStructuredData', () => {
  it('replaces server data and removes it when the trip is no longer available', async () => {
    const server = document.createElement('script');
    server.id = 'ikuyo-page-jsonld';
    document.head.appendChild(server);
    vi.mocked(apiRequest).mockResolvedValue([
      { name: '</script><script>text</script>' },
    ]);
    const view = render(<TripStructuredData trip={trip('one')} />);
    await waitFor(() => expect(script()?.textContent).toContain('</script>'));
    expect(server.isConnected).toBe(false);
    expect(document.querySelectorAll('#ikuyo-page-jsonld')).toHaveLength(1);
    expect(script()?.getAttribute('type')).toBe('application/ld+json');
    view.rerender(<TripStructuredData trip={undefined} />);
    expect(script()).toBeNull();
    view.unmount();
  });

  it('ignores an old request after navigation and cleans up on unmount', async () => {
    let finishFirst: (value: unknown) => void = () => {};
    vi.mocked(apiRequest)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishFirst = resolve;
          }),
      )
      .mockResolvedValueOnce([{ name: 'Second trip' }]);
    const view = render(<TripStructuredData trip={trip('one')} />);
    const firstSignal = vi.mocked(apiRequest).mock.calls[0][1]?.signal;
    view.rerender(<TripStructuredData trip={trip('two')} />);
    await waitFor(() => expect(script()?.textContent).toContain('Second trip'));
    await act(async () => {
      finishFirst([{ name: 'First trip' }]);
    });
    expect(firstSignal?.aborted).toBe(true);
    expect(script()?.textContent).not.toContain('First trip');
    view.unmount();
    expect(script()).toBeNull();
  });

  it('leaves no stale metadata when access fails', async () => {
    vi.mocked(apiRequest).mockRejectedValue(new Error('Forbidden'));
    const view = render(<TripStructuredData trip={trip('private')} />);
    await act(async () => {});
    expect(script()).toBeNull();
    view.unmount();
  });

  it('refreshes metadata after an activity changes without changing trips', async () => {
    const currentTrip = trip('one');
    vi.mocked(apiRequest).mockResolvedValue([{ name: 'Before edit' }]);
    const view = render(<TripStructuredData trip={currentTrip} />);
    await waitFor(() => expect(script()?.textContent).toContain('Before edit'));
    snapshots.activities = [{ id: 'changed' }];
    vi.mocked(apiRequest).mockResolvedValue([{ name: 'After edit' }]);
    view.rerender(<TripStructuredData trip={currentTrip} />);
    await waitFor(() => expect(script()?.textContent).toContain('After edit'));
    expect(apiRequest).toHaveBeenCalledTimes(2);
    view.unmount();
  });
});
