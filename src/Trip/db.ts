import { id, lookup, type TransactionChunk } from '@instantdb/core';
import type { AppSchema } from '../../instant.schema';
import type {
  DbAccommodation,
  DbAccommodationWithTrip,
} from '../Accommodation/db';
import type { DbActivity, DbActivityWithTrip } from '../Activity/db';
import type { DbCommentGroup, DbCommentGroupObjectType } from '../Comment/db';
import { db } from '../data/db';
import type { DbUser } from '../data/types';
import type { DbMacroplan, DbMacroplanWithTrip } from '../Macroplan/db';
import { generateUniqueHandle } from '../User/handle';
import { TripUserRole } from '../User/TripUserRole';
import type { TripSliceTrip } from './store/types';
import type { TripSharingLevelType } from './tripSharingLevel';

export type DbTripFull = Omit<
  DbTrip,
  'activity' | 'accommodation' | 'macroplan' | 'commentGroup'
> & {
  accommodation: DbAccommodationWithTrip[];
  activity: DbActivityWithTrip[];
  macroplan: DbMacroplanWithTrip[];
  commentGroup: DbCommentGroup<DbCommentGroupObjectType>[];
};

export type DbTripWithAccommodation = Omit<DbTrip, 'accommodation'> & {
  accommodation: DbAccommodationWithTrip[];
};

export type DbTripWithMacroplan = Omit<DbTrip, 'macroplan'> & {
  macroplan: DbMacroplanWithTrip[];
};

export type DbTripWithActivity = Omit<DbTrip, 'activity'> & {
  activity: DbActivityWithTrip[];
};
export type DbTrip = {
  id: string;
  title: string;
  /** ms of day of the trip start */
  timestampStart: number;
  /** ms of day _after_ of trip end. This means the final full day of trip is one day before `timestampEnd` */
  timestampEnd: number;
  timeZone: string;
  /** destination 2-letter Intl region. Uppercase! */
  region: string;
  /** destination's default currency */
  currency: string;
  /** origin's default currency */
  originCurrency: string;
  /** origin 2-letter Intl region. Uppercase! Optional for backward compat */
  originRegion: string;
  /** origin's IANA time zone. Optional for backward compat */
  originTimeZone: string;

  /** 0: private; 1: group (removed, no longer in use); 2: public but unlisted; 3: public listed in public directory */
  sharingLevel: TripSharingLevelType;
  /** undefined = visible; false = hidden for public visitors */
  publicShowExpenses?: boolean;
  /** undefined = visible; false = hidden for public visitors */
  publicShowTasks?: boolean;
  /** undefined = visible; false = hidden for public visitors */
  publicShowComments?: boolean;
  /** undefined = visible; false = hidden for invited Viewers */
  viewerShowExpenses?: boolean;
  /** undefined = visible; false = hidden for invited Viewers */
  viewerShowTasks?: boolean;
  /** undefined = visible; false = hidden for invited Viewers */
  viewerShowComments?: boolean;

  activity: DbActivity[] | undefined;
  accommodation: DbAccommodation[] | undefined;
  macroplan: DbMacroplan[] | undefined;

  tripUser: DbTripUser[] | undefined;
  commentGroup: DbCommentGroup<DbCommentGroupObjectType>[] | undefined;
};

export type DbTripUser = {
  id: string;

  createdAt: number;
  lastUpdatedAt: number;
  role: TripUserRole;

  trip: DbTrip[] | undefined;
  user: DbUser[] | undefined;
};

export async function dbAddTrip(
  newTrip: Omit<
    DbTrip,
    | 'id'
    | 'createdAt'
    | 'lastUpdatedAt'
    | 'activity'
    | 'accommodation'
    | 'tripUser'
    | 'macroplan'
    | 'commentGroup'
  >,
  {
    userId,
  }: {
    userId: string;
  },
) {
  const newTripId = id();
  const newTripUserId = id();
  return {
    id: newTripId,
    result: await db.transact([
      db.tx.trip[newTripId].update({
        ...newTrip,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
      }),
      db.tx.tripUser[newTripUserId]
        .update({
          createdAt: Date.now(),
          lastUpdatedAt: Date.now(),
          role: TripUserRole.Owner,
        })
        .link({
          user: userId,
          trip: newTripId,
        }),
    ]),
  };
}
export async function dbUpdateTrip(
  trip: Omit<
    DbTrip,
    | 'createdAt'
    | 'lastUpdatedAt'
    | 'accommodation'
    | 'activity'
    | 'tripUser'
    | 'macroplan'
    | 'commentGroup'
  >,
) {
  const tripId = trip.id;

  const transactionTimestamp = Date.now();
  // biome-ignore lint/suspicious/noExplicitAny: The type should be generic
  const transactions: TransactionChunk<any, any>[] = [
    db.tx.trip[tripId].merge({
      ...trip,
      lastUpdatedAt: transactionTimestamp,
    }),
  ];

  return db.transact(transactions);
}
export type TripDuplicateOptions = {
  title: string;
  includeActivities: boolean;
  includeMacroplans: boolean;
  includeAccommodations: boolean;
  includeExpenses: boolean;
  includeTasks: boolean;
  includeComments: boolean;
};

/**
 * Duplicate a trip into a new trip owned by `userId`.
 *
 * The new trip is created as private (sharingLevel 0). Only the sections
 * selected via `options` are copied. Comments are only copied for objects
 * that are themselves copied (i.e. a comment on an activity is skipped when
 * activities are not selected).
 */
export async function dbDuplicateTrip(
  sourceTripId: string,
  options: TripDuplicateOptions,
  { userId }: { userId: string },
) {
  const tripData = await db.queryOnce({
    trip: {
      $: {
        where: {
          id: sourceTripId,
        },
      },
      activity: {},
      accommodation: {},
      macroplan: {},
      expense: {},
      taskList: { task: {} },
      commentGroup: {
        comment: { user: {} },
        object: {
          activity: {},
          accommodation: {},
          expense: {},
          trip: {},
          macroplan: {},
          task: {},
        },
      },
    },
  });

  const sourceTrip = tripData.data.trip[0];
  if (!sourceTrip) {
    throw new Error(`Trip with id ${sourceTripId} not found`);
  }

  const now = Date.now();
  const newTripId = id();
  const newTripUserId = id();

  // biome-ignore lint/suspicious/noExplicitAny: The type should be generic
  const transactions: TransactionChunk<any, any>[] = [
    db.tx.trip[newTripId].update({
      title: options.title,
      timestampStart: sourceTrip.timestampStart,
      timestampEnd: sourceTrip.timestampEnd,
      timeZone: sourceTrip.timeZone,
      region: sourceTrip.region,
      currency: sourceTrip.currency,
      originCurrency: sourceTrip.originCurrency,
      originRegion: sourceTrip.originRegion,
      originTimeZone: sourceTrip.originTimeZone,
      // A duplicated trip is always private and owned by the duplicating user
      sharingLevel: 0,
      createdAt: now,
      lastUpdatedAt: now,
    }),
    db.tx.tripUser[newTripUserId]
      .update({
        createdAt: now,
        lastUpdatedAt: now,
        role: TripUserRole.Owner,
      })
      .link({
        user: userId,
        trip: newTripId,
      }),
  ];

  // old id -> new id, per copied object. Only populated for selected sections.
  const activityIdMap = new Map<string, string>();
  const accommodationIdMap = new Map<string, string>();
  const macroplanIdMap = new Map<string, string>();
  const expenseIdMap = new Map<string, string>();
  const taskIdMap = new Map<string, string>();

  for (const activity of sourceTrip.activity ?? []) {
    if (!options.includeActivities) break;
    const newId = id();
    activityIdMap.set(activity.id, newId);
    transactions.push(
      db.tx.activity[newId]
        .update({
          title: activity.title,
          description: activity.description,
          location: activity.location,
          locationLat: activity.locationLat,
          locationLng: activity.locationLng,
          locationZoom: activity.locationZoom,
          locationDestination: activity.locationDestination,
          locationDestinationLat: activity.locationDestinationLat,
          locationDestinationLng: activity.locationDestinationLng,
          locationDestinationZoom: activity.locationDestinationZoom,
          timestampStart: activity.timestampStart,
          timestampEnd: activity.timestampEnd,
          timeZoneStart: activity.timeZoneStart,
          timeZoneEnd: activity.timeZoneEnd,
          flags: activity.flags,
          icon: activity.icon,
          createdAt: now,
          lastUpdatedAt: now,
        })
        .link({
          trip: newTripId,
        }),
    );
  }

  for (const accommodation of sourceTrip.accommodation ?? []) {
    if (!options.includeAccommodations) break;
    const newId = id();
    accommodationIdMap.set(accommodation.id, newId);
    transactions.push(
      db.tx.accommodation[newId]
        .update({
          name: accommodation.name,
          address: accommodation.address,
          timestampCheckIn: accommodation.timestampCheckIn,
          timestampCheckOut: accommodation.timestampCheckOut,
          timeZoneCheckIn: accommodation.timeZoneCheckIn,
          timeZoneCheckOut: accommodation.timeZoneCheckOut,
          phoneNumber: accommodation.phoneNumber,
          notes: accommodation.notes,
          locationLat: accommodation.locationLat,
          locationLng: accommodation.locationLng,
          locationZoom: accommodation.locationZoom,
          createdAt: now,
          lastUpdatedAt: now,
        })
        .link({
          trip: newTripId,
        }),
    );
  }

  for (const macroplan of sourceTrip.macroplan ?? []) {
    if (!options.includeMacroplans) break;
    const newId = id();
    macroplanIdMap.set(macroplan.id, newId);
    transactions.push(
      db.tx.macroplan[newId]
        .update({
          name: macroplan.name,
          notes: macroplan.notes,
          timestampStart: macroplan.timestampStart,
          timestampEnd: macroplan.timestampEnd,
          timeZoneStart: macroplan.timeZoneStart,
          timeZoneEnd: macroplan.timeZoneEnd,
          createdAt: now,
          lastUpdatedAt: now,
        })
        .link({
          trip: newTripId,
        }),
    );
  }

  for (const expense of sourceTrip.expense ?? []) {
    if (!options.includeExpenses) break;
    const newId = id();
    expenseIdMap.set(expense.id, newId);
    transactions.push(
      db.tx.expense[newId]
        .update({
          title: expense.title,
          description: expense.description,
          timestampIncurred: expense.timestampIncurred,
          currency: expense.currency,
          amount: expense.amount,
          currencyConversionFactor: expense.currencyConversionFactor,
          amountInOriginCurrency: expense.amountInOriginCurrency,
          timeZoneIncurred: expense.timeZoneIncurred,
          createdAt: now,
          lastUpdatedAt: now,
        })
        .link({
          trip: newTripId,
        }),
    );
  }

  if (options.includeTasks) {
    for (const taskList of sourceTrip.taskList ?? []) {
      const newTaskListId = id();
      transactions.push(
        db.tx.taskList[newTaskListId]
          .update({
            title: taskList.title,
            index: taskList.index,
            status: taskList.status,
            createdAt: now,
            lastUpdatedAt: now,
          })
          .link({
            trip: newTripId,
          }),
      );
      for (const task of taskList.task ?? []) {
        const newTaskId = id();
        taskIdMap.set(task.id, newTaskId);
        transactions.push(
          db.tx.task[newTaskId]
            .update({
              title: task.title,
              description: task.description,
              index: task.index,
              status: task.status,
              dueAt: task.dueAt,
              completedAt: task.completedAt,
              createdAt: now,
              lastUpdatedAt: now,
            })
            .link({
              taskList: newTaskListId,
            }),
        );
      }
    }
  }

  if (options.includeComments) {
    for (const commentGroup of sourceTrip.commentGroup ?? []) {
      const object = commentGroup.object;
      if (!object?.type) continue;

      // Resolve the new object id this comment group should attach to.
      let newObjectId: string | undefined;
      switch (object.type) {
        case 'trip':
          newObjectId = newTripId;
          break;
        case 'activity':
          newObjectId = activityIdMap.get(object.activity?.[0]?.id ?? '');
          break;
        case 'accommodation':
          newObjectId = accommodationIdMap.get(
            object.accommodation?.[0]?.id ?? '',
          );
          break;
        case 'macroplan':
          newObjectId = macroplanIdMap.get(object.macroplan?.[0]?.id ?? '');
          break;
        case 'expense':
          newObjectId = expenseIdMap.get(object.expense?.[0]?.id ?? '');
          break;
        case 'task':
          newObjectId = taskIdMap.get(object.task?.[0]?.id ?? '');
          break;
      }
      // Skip comments whose object was not copied (follow copied objects only).
      if (!newObjectId) continue;

      const newCommentGroupId = id();
      transactions.push(
        db.tx.commentGroup[newCommentGroupId]
          .update({
            status: commentGroup.status,
            createdAt: now,
            lastUpdatedAt: now,
          })
          .link({
            trip: newTripId,
            object: newCommentGroupId,
          }),
        db.tx.commentGroupObject[newCommentGroupId]
          .update({
            type: object.type,
            createdAt: now,
            lastUpdatedAt: now,
          })
          .link({
            commentGroup: newCommentGroupId,
            [object.type]: newObjectId,
          }),
      );

      for (const comment of commentGroup.comment ?? []) {
        const newCommentId = id();
        transactions.push(
          db.tx.comment[newCommentId]
            .update({
              content: comment.content,
              createdAt: now,
              lastUpdatedAt: now,
            })
            .link({
              group: newCommentGroupId,
              user: comment.user?.id,
            }),
        );
      }
    }
  }

  const result = await db.transact(transactions);

  return {
    id: newTripId,
    result,
  };
}

export async function dbUpdateTripSharingLevel(
  tripId: string,
  sharingLevel: TripSharingLevelType,
) {
  const transactionTimestamp = Date.now();
  return db.transact([
    db.tx.trip[tripId].merge({
      sharingLevel,
      lastUpdatedAt: transactionTimestamp,
    }),
  ]);
}

export async function dbDeleteTrip(trip: TripSliceTrip) {
  const tripData = await db.queryOnce({
    trip: {
      $: {
        where: {
          id: trip.id,
        },
        fields: ['id'],
      },
      activity: { $: { fields: ['id'] } },
      accommodation: { $: { fields: ['id'] } },
      macroplan: { $: { fields: ['id'] } },
      expense: { $: { fields: ['id'] } },
      tripUser: { $: { fields: ['id'] } },
      taskList: { $: { fields: ['id'] }, task: { $: { fields: ['id'] } } },
      commentGroup: {
        $: { fields: ['id'] },
        comment: { $: { fields: ['id'] } },
        object: { $: { fields: ['id'] } },
      },
    },
  });

  return db.transact([
    ...tripData.data.trip[0].commentGroup.flatMap((commentGroup) =>
      commentGroup.comment.map((comment) => db.tx.comment[comment.id].delete()),
    ),
    ...tripData.data.trip[0].commentGroup
      .map((commentGroup) => {
        if (commentGroup.object?.id) {
          return db.tx.commentGroupObject[commentGroup.object.id].delete();
        }
        return undefined;
      })
      .filter(
        (tx): tx is TransactionChunk<AppSchema, 'commentGroupObject'> =>
          tx !== undefined,
      ),
    ...tripData.data.trip[0].commentGroup.map((commentGroup) =>
      db.tx.commentGroup[commentGroup.id].delete(),
    ),
    ...tripData.data.trip[0].tripUser.map((tripUser) =>
      db.tx.tripUser[tripUser.id].delete(),
    ),
    ...tripData.data.trip[0].expense.map((expense) =>
      db.tx.expense[expense.id].delete(),
    ),
    ...tripData.data.trip[0].taskList.flatMap((taskList) =>
      taskList.task.map((task) => db.tx.task[task.id].delete()),
    ),
    ...tripData.data.trip[0].taskList.map((taskList) =>
      db.tx.taskList[taskList.id].delete(),
    ),
    ...tripData.data.trip[0].macroplan.map((macroplan) =>
      db.tx.macroplan[macroplan.id].delete(),
    ),
    ...tripData.data.trip[0].accommodation.map((accommodation) =>
      db.tx.accommodation[accommodation.id].delete(),
    ),
    ...tripData.data.trip[0].activity.map((activity) =>
      db.tx.activity[activity.id].delete(),
    ),
    db.tx.trip[trip.id].delete(),
  ]);
}

export async function dbAddUserToTrip({
  tripId,
  userEmail,
  userRole,
}: {
  tripId: string;
  userEmail: string;
  userRole: TripUserRole;
}) {
  const lastUpdatedAt = Date.now();
  // biome-ignore lint/suspicious/noExplicitAny: The type should be generic
  const transactions: TransactionChunk<any, any>[] = [];

  const { data: userData } = await db.queryOnce({
    user: {
      $: {
        where: {
          email: userEmail,
        },
        limit: 1,
      },
    },
  });

  const user = userData.user[0] as undefined | Omit<DbUser, 'tripUser'>;

  let userId = user?.id;
  if (!userId) {
    // New user
    userId = id();
    const defaultHandle = await generateUniqueHandle();
    transactions.push(
      db.tx.user[userId].update({
        handle: defaultHandle,
        email: userEmail,
        activated: false,
        createdAt: lastUpdatedAt,
        lastUpdatedAt: lastUpdatedAt,
      }),
    );
  }

  const { data: tripUserData } = await db.queryOnce({
    tripUser: {
      $: {
        where: {
          'trip.id': tripId,
          'user.email': userEmail,
        },
        limit: 1,
      },
    },
  });
  const tripUser = tripUserData.tripUser[0] as
    | undefined
    | Omit<DbTripUser, 'trip' | 'user'>;

  let tripUserId = tripUser?.id;
  if (!tripUserId) {
    // New TripUser entity: create new row, and link to Trip & User
    tripUserId = id();
    transactions.push(
      db.tx.tripUser[tripUserId]
        .update({
          createdAt: lastUpdatedAt,
          lastUpdatedAt: lastUpdatedAt,
          role: userRole,
        })
        .link({
          trip: tripId,
          user: userId,
        }),
    );
  } else {
    // Existing TripUser entity, just update the "row" column
    transactions.push(
      db.tx.tripUser[tripUserId].update({
        lastUpdatedAt: lastUpdatedAt,
        role: userRole,
      }),
    );
  }

  return db.transact(transactions);
}
export async function dbUpdateUserFromTrip({
  tripId,
  userEmail,
  userRole,
}: {
  tripId: string;
  userEmail: string;
  previousUserRole: TripUserRole;
  userRole: TripUserRole;
}) {
  const lastUpdatedAt = Date.now();
  // biome-ignore lint/suspicious/noExplicitAny: The type should be generic
  const transactions: TransactionChunk<any, any>[] = [];

  const { data: tripUserData } = await db.queryOnce({
    tripUser: {
      $: {
        where: {
          'trip.id': tripId,
          'user.email': userEmail,
        },
        limit: 1,
      },
    },
  });
  const tripUser = tripUserData.tripUser[0] as
    | undefined
    | Omit<DbTripUser, 'trip' | 'user'>;
  let tripUserId = tripUser?.id;

  if (!tripUserId) {
    // New TripUser entity: create new row, and link to Trip & User
    tripUserId = id();
    transactions.push(
      db.tx.tripUser[tripUserId]
        .update({
          createdAt: lastUpdatedAt,
          lastUpdatedAt: lastUpdatedAt,
          role: userRole,
        })
        .link({
          trip: tripId,
          user: lookup('email', userEmail),
        }),
    );
  } else {
    // Existing TripUser entity, just update the "row" column
    transactions.push(
      db.tx.tripUser[tripUserId].update({
        lastUpdatedAt: lastUpdatedAt,
        role: userRole,
      }),
    );
  }

  return db.transact(transactions);
}
export async function dbRemoveUserFromTrip(tripUserId: string) {
  return db.transact([db.tx.tripUser[tripUserId].delete()]);
}
export async function dbUpdateTripSectionVisibility(
  tripId: string,
  fields: Partial<
    Pick<
      DbTrip,
      | 'publicShowExpenses'
      | 'publicShowTasks'
      | 'publicShowComments'
      | 'viewerShowExpenses'
      | 'viewerShowTasks'
      | 'viewerShowComments'
    >
  >,
): Promise<void> {
  await db.transact(
    db.tx.trip[tripId].merge({ ...fields, lastUpdatedAt: Date.now() }),
  );
}
