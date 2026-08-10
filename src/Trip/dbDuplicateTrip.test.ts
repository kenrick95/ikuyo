import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryOnceMock, transactMock } = vi.hoisted(() => ({
  queryOnceMock: vi.fn(),
  transactMock: vi.fn(),
}));

vi.mock('../data/db', () => {
  const updateResult = { link: () => ({}) };
  const builder = { update: () => updateResult };
  // `db.tx.<entity>[id].update(...).link(...)`: any property access or index
  // yields the next link in the chain.
  const entityAccessor = new Proxy(() => {}, {
    get: () => builder,
  });
  return {
    db: {
      queryOnce: queryOnceMock,
      transact: transactMock,
      tx: new Proxy(
        {},
        {
          get: () => entityAccessor,
        },
      ),
    },
  };
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

function sourceTrip() {
  return {
    id: 'src',
    title: 'Source',
    timestampStart: 0,
    timestampEnd: 86400000,
    timeZone: 'UTC',
    region: 'US',
    currency: 'USD',
    originCurrency: 'USD',
    originRegion: 'US',
    originTimeZone: 'UTC',
    activity: [],
    accommodation: [],
    macroplan: [],
    expense: [],
    taskList: [],
  };
}

describe('dbDuplicateTrip authorization', () => {
  beforeEach(() => {
    queryOnceMock.mockReset();
    transactMock.mockReset();
  });

  it('does not duplicate a trip the user cannot read', async () => {
    // Simulates InstantDB read permissions returning nothing for an
    // inaccessible (e.g. private) trip.
    queryOnceMock.mockResolvedValue({ data: { trip: [] } });

    await expect(
      dbDuplicateTrip('private-inaccessible', baseOptions, { userId: 'u' }),
    ).rejects.toThrow(/not found/);
    expect(transactMock).not.toHaveBeenCalled();
  });

  it('duplicates a readable / public trip', async () => {
    queryOnceMock.mockResolvedValue({ data: { trip: [sourceTrip()] } });

    const res = await dbDuplicateTrip('public-accessible', baseOptions, {
      userId: 'u',
    });
    expect(res.id).toBeTruthy();
    expect(transactMock).toHaveBeenCalledTimes(1);
  });
});
