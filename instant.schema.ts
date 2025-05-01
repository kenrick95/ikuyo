// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from '@instantdb/react';

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.any(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed(),
    }),
    accommodation: i.entity({
      address: i.string(),
      createdAt: i.number(),
      lastUpdatedAt: i.number(),
      name: i.string(),
      notes: i.string(),
      phoneNumber: i.string(),
      timestampCheckIn: i.number(),
      timestampCheckOut: i.number(),
    }),
    macroplan: i.entity({
      name: i.string(),
      notes: i.string(),
      timestampStart: i.number(),
      timestampEnd: i.number(),
      createdAt: i.number(),
      lastUpdatedAt: i.number(),
    }),
    activity: i.entity({
      createdAt: i.number(),
      description: i.string(),
      lastUpdatedAt: i.number(),
      location: i.string(),
      locationLat: i.number(),
      locationLng: i.number(),

      timestampEnd: i.number(),
      timestampStart: i.number(),
      title: i.string(),
    }),
    expense: i.entity({
      amount: i.number(),
      amountInDefaultCurrency: i.number(),
      amountInOriginCurrency: i.number(),
      createdAt: i.number(),
      currency: i.string(),
      currencyConversionFactor: i.number(),
      description: i.string(),
      lastUpdatedAt: i.number(),
      timestampIncurred: i.number(),
      title: i.string(),
    }),
    trip: i.entity({
      createdAt: i.number(),
      currency: i.string(),
      region: i.string(),
      lastUpdatedAt: i.number(),
      originCurrency: i.string(),
      timestampEnd: i.number().indexed(),
      timestampStart: i.number(),
      timeZone: i.string(),
      title: i.string(),
    }),
    tripUser: i.entity({
      createdAt: i.number(),
      lastUpdatedAt: i.number(),
      role: i.string(),
    }),
    user: i.entity({
      activated: i.boolean(),
      createdAt: i.number(),
      email: i.string().unique().indexed(),
      handle: i.string().unique().indexed(),
      lastUpdatedAt: i.number(),
    }),
    commentGroup: i.entity({
      status: i.number(),
      createdAt: i.number(),
      lastUpdatedAt: i.number(),
    }),
    comment: i.entity({
      content: i.string(),
      createdAt: i.number(),
      lastUpdatedAt: i.number(),
    }),
    commentGroupObject: i.entity({
      type: i.string(),
      createdAt: i.number(),
      lastUpdatedAt: i.number(),
    }),
  },
  links: {
    /** trip 1:N activity */
    activity$trip: {
      forward: {
        on: 'activity',
        has: 'one',
        label: 'trip',
      },
      reverse: {
        on: 'trip',
        has: 'many',
        label: 'activity',
      },
    },
    /** trip 1:N accommodation */
    trip$accommodation: {
      forward: {
        on: 'trip',
        has: 'many',
        label: 'accommodation',
      },
      reverse: {
        on: 'accommodation',
        has: 'one',
        label: 'trip',
      },
    },
    /** trip 1:N macroplan */
    trip$macroplan: {
      forward: {
        on: 'trip',
        has: 'many',
        label: 'macroplan',
      },
      reverse: {
        on: 'macroplan',
        has: 'one',
        label: 'trip',
      },
    },
    /** trip 1:N expense */
    trip$expense: {
      forward: {
        on: 'trip',
        has: 'many',
        label: 'expense',
      },
      reverse: {
        on: 'expense',
        has: 'one',
        label: 'trip',
      },
    },
    /** trip N:N tripUser */
    trip$tripUser: {
      forward: {
        on: 'trip',
        has: 'many',
        label: 'tripUser',
      },
      reverse: {
        on: 'tripUser',
        has: 'many',
        label: 'trip',
      },
    },
    /** user 1:1 $users */
    user$$users: {
      forward: {
        on: 'user',
        has: 'one',
        label: '$users',
      },
      reverse: {
        on: '$users',
        has: 'one',
        label: 'user',
      },
    },
    /** user N:N tripUser */
    user$tripUser: {
      forward: {
        on: 'user',
        has: 'many',
        label: 'tripUser',
      },
      reverse: {
        on: 'tripUser',
        has: 'many',
        label: 'user',
      },
    },
    /** commentGroup 1:N comment */
    commentGroup$comment: {
      forward: {
        on: 'commentGroup',
        has: 'many',
        label: 'comment',
      },
      reverse: {
        on: 'comment',
        has: 'one',
        label: 'group',
      },
    },

    /** comment 1:N user */
    comment$user: {
      forward: {
        on: 'comment',
        has: 'one',
        label: 'user',
      },
      reverse: {
        on: 'user',
        has: 'many',
        label: 'comment',
      },
    },
    /** trip 1:N commentGroup */
    commentGroup$trip: {
      forward: {
        on: 'commentGroup',
        has: 'one',
        label: 'trip',
      },
      reverse: {
        on: 'trip',
        has: 'many',
        label: 'commentGroup',
      },
    },
    /** commentGroup 1:1 commentGroupObject */
    commentGroup$commentGroupObject: {
      forward: {
        on: 'commentGroup',
        has: 'one',
        label: 'object',
      },
      reverse: {
        on: 'commentGroupObject',
        has: 'one',
        label: 'commentGroup',
      },
    },
    /** commentGroupObject N:N trip */
    commentGroupObject$trip: {
      forward: {
        on: 'commentGroupObject',
        has: 'many',
        label: 'trip',
      },
      reverse: {
        on: 'trip',
        has: 'many',
        label: 'commentGroupObject',
      },
    },
    /** commentGroupObject N:N macroplan */
    commentGroupObject$macroplan: {
      forward: {
        on: 'commentGroupObject',
        has: 'many',
        label: 'macroplan',
      },
      reverse: {
        on: 'macroplan',
        has: 'many',
        label: 'commentGroupObject',
      },
    },
    /** commentGroupObject N:N activity */
    commentGroupObject$activity: {
      forward: {
        on: 'commentGroupObject',
        has: 'many',
        label: 'activity',
      },
      reverse: {
        on: 'activity',
        has: 'many',
        label: 'commentGroupObject',
      },
    },
    /** commentGroupObject N:N accommodation */
    commentGroupObject$accommodation: {
      forward: {
        on: 'commentGroupObject',
        has: 'many',
        label: 'accommodation',
      },
      reverse: {
        on: 'accommodation',
        has: 'many',
        label: 'commentGroupObject',
      },
    },
    /** commentGroupObject N:N expense */
    commentGroupObject$expense: {
      forward: {
        on: 'commentGroupObject',
        has: 'many',
        label: 'expense',
      },
      reverse: {
        on: 'expense',
        has: 'many',
        label: 'commentGroupObject',
      },
    },
  },
  rooms: {},
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
