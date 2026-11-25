import { beforeEach, describe, expect, test, vi } from 'vitest';

const { postMutationMock } = vi.hoisted(() => ({
  postMutationMock: vi.fn(),
}));

vi.mock('../data/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/apiClient')>();
  return { ...actual, postMutation: postMutationMock };
});

import { dbDuplicateTrip } from './db';

const baseOptions = {
  title: 'Copy',
  startDateMs: 0,
  endDateMs: 86400000,
  includeActivities: false,
  includeMacroplans: false,
  includeAccommodations: false,
  includeExpenses: false,
  includeTasks: false,
  removeActivityDates: false,
};

const sourceTrip = {
  id: 'source-id',
  timestampStart: Date.parse('2026-03-05T00:00:00-05:00'),
  timeZone: 'America/New_York',
};
const destination = {
  id: 'stop-id',
  name: 'New York',
  region: 'US',
  timeZone: 'America/New_York',
  currency: 'USD',
  startsOn: '2026-03-06',
  startsAtTime: '02:30',
  startOffset: null,
  startsAtMs: Date.parse('2026-03-06T02:30:00-05:00'),
};
const multiRegionTrip = { ...sourceTrip, destinations: [destination] };

describe('dbDuplicateTrip', () => {
  beforeEach(() => {
    postMutationMock.mockReset();
  });

  test('duplicates via the Laravel endpoint and returns the new trip id', async () => {
    postMutationMock.mockResolvedValue({ id: 'new-trip-id' });

    const res = await dbDuplicateTrip(sourceTrip, baseOptions, {
      userId: 'u',
    });
    expect(res.id).toBe('new-trip-id');
    expect(postMutationMock).toHaveBeenCalledTimes(1);
    expect(postMutationMock).toHaveBeenCalledWith(
      '/api/trips/source-id/duplicate',
      baseOptions,
    );
  });

  test('sends shifted local starts and their resolved instants in one request', async () => {
    postMutationMock.mockResolvedValue({ id: 'new-trip-id' });
    const options = {
      ...baseOptions,
      startDateMs: Date.parse('2026-03-09T00:00:00-04:00'),
      endDateMs: Date.parse('2026-03-12T00:00:00-04:00'),
    };

    await dbDuplicateTrip(multiRegionTrip, options, { userId: 'u' });

    expect(postMutationMock).toHaveBeenCalledTimes(1);
    expect(postMutationMock).toHaveBeenCalledWith(
      '/api/trips/source-id/duplicate',
      {
        ...options,
        destinations: [
          {
            ...destination,
            startsOn: '2026-03-10',
            startsAtMs: Date.parse('2026-03-10T02:30:00-04:00'),
          },
        ],
      },
    );
  });

  test('rejects a shifted start in a clock gap before calling the API', async () => {
    await expect(
      dbDuplicateTrip(
        multiRegionTrip,
        {
          ...baseOptions,
          startDateMs: Date.parse('2026-03-07T00:00:00-05:00'),
          endDateMs: Date.parse('2026-03-10T00:00:00-04:00'),
        },
        { userId: 'u' },
      ),
    ).rejects.toThrow('New York has an invalid or ambiguous start');
    expect(postMutationMock).not.toHaveBeenCalled();
  });
});
