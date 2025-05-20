import { id } from '@instantdb/core';
import { db } from '../data/db';
import type { DbTrip, DbTripWithMacroplan } from '../Trip/db';

export type DbMacroplanWithTrip = Omit<DbMacroplan, 'trip'> & {
  trip: DbTripWithMacroplan;
};

/**
 * Macroplan is a rough plan for the trip,
 * that can span across days, or only for a single day
 * Allow overlaps too.
 * Displays as additional row like accomodation in timetable.
 *
 * Use case:
 * - in a long trip, I want to plan the trips with several different major locations; so using Macroplan will help break down the whole trip into smaller parts
 *
 * Convention: The "p" in "Macroplan" is not capitalized
 */
export type DbMacroplan = {
  id: string;
  name: string;
  notes: string;

  /** ms */
  timestampStart: number;
  /** ms of day _after_ of macroplan end. This means the final full day of macroplan is one day before `timestampEnd` */
  timestampEnd: number;

  /** ms */
  createdAt: number;

  /** ms */
  lastUpdatedAt: number;

  trip: DbTrip | undefined;
};

export async function dbAddMacroplan(
  newMacroplan: Omit<
    DbMacroplan,
    'id' | 'createdAt' | 'lastUpdatedAt' | 'trip'
  >,
  { tripId }: { tripId: string },
) {
  const newMacroplanId = id();
  return {
    id: newMacroplanId,
    result: await db.transact([
      db.tx.macroplan[newMacroplanId]
        .update({
          ...newMacroplan,
          createdAt: Date.now(),
          lastUpdatedAt: Date.now(),
        })
        .link({
          trip: tripId,
        }),
    ]),
  };
}

export async function dbUpdateMacroplan(
  macroplan: Omit<DbMacroplan, 'createdAt' | 'lastUpdatedAt' | 'trip'>,
) {
  return db.transact(
    db.tx.macroplan[macroplan.id].merge({
      ...macroplan,
      lastUpdatedAt: Date.now(),
    }),
  );
}

export async function dbDeleteMacroplan(macroplanId: string, tripId: string) {
  return db.transact([
    db.tx.trip[tripId].unlink({
      macroplan: [macroplanId],
    }),
    db.tx.macroplan[macroplanId].delete(),
  ]);
}
