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

describe('dbDuplicateTrip', () => {
  beforeEach(() => {
    postMutationMock.mockReset();
  });

  test('duplicates via the Laravel endpoint and returns the new trip id', async () => {
    postMutationMock.mockResolvedValue({ id: 'new-trip-id' });

    const res = await dbDuplicateTrip('source-id', baseOptions, {
      userId: 'u',
    });
    expect(res.id).toBe('new-trip-id');
    expect(postMutationMock).toHaveBeenCalledTimes(1);
    expect(postMutationMock).toHaveBeenCalledWith(
      '/api/trips/source-id/duplicate',
      baseOptions,
    );
  });
});
