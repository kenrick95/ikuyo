// Ikuyo
// https://instantdb.com/dash?s=main&t=home&app=6962735b-d61f-4c3c-a78f-03ca3fa6ba9a

import { i } from '@instantdb/react';

const graph = i.graph(
  {
    activity: i.entity({
      createdAt: i.number(),
      description: i.string(),
      lastUpdatedAt: i.number(),
      location: i.string(),
      timestampEnd: i.number(),
      timestampStart: i.number(),
      title: i.string(),
    }),
    trip: i.entity({
      createdAt: i.number(),
      lastUpdatedAt: i.number(),
      timestampEnd: i.number(),
      timestampStart: i.number(),
      timeZone: i.string(),
      title: i.string(),
    }),
    user: i.entity({
      createdAt: i.number(),
      handle: i.string().unique().indexed(),
      email: i.string().unique().indexed(),
      lastUpdatedAt: i.number(),
    }),
  },
  {
    activityTrip: {
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
    tripUser: {
      forward: {
        on: 'trip',
        has: 'many',
        label: 'user',
      },
      reverse: {
        on: 'user',
        has: 'many',
        label: 'trip',
      },
    },
  }
);

export default graph;
