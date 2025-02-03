export default {
  attrs: {
    allow: {
      create: 'false',
      delete: 'false',
      update: 'false',
    },
  },
  trip: {
    bind: [
      'isTripEditor',
      "'editor' in data.ref('tripUser.role') && auth.email in data.ref('tripUser.user.email')",
      'isTripOwner',
      "'owner' in data.ref('tripUser.role') && auth.email in data.ref('tripUser.user.email')",
      'isTripViewer',
      "'viewer' in data.ref('tripUser.role') && auth.email in data.ref('tripUser.user.email')",
    ],
    allow: {
      view: 'isTripViewer || isTripEditor || isTripOwner',
      create: 'isTripOwner',
      delete: 'isTripOwner',
      update: 'isTripEditor || isTripOwner',
    },
  },
  user: {
    bind: ['isSelf', 'auth.email == data.email'],
    allow: {
      view: 'true',
      // Anyone can create a new user, e.g. from sharing to a new email
      create: 'true',
      delete: 'false',
      // TODO: Linking to an existing user requires "update" permission; probably should specify what fields can be updated
      update: 'true',
    },
  },
  $users: {
    allow: {
      view: 'auth.id == data.id',
      create: 'false',
      delete: 'false',
      update: 'false',
    },
  },
  activity: {
    bind: [
      'isTripEditor',
      "'editor' in data.ref('trip.tripUser.role') && auth.email in data.ref('trip.tripUser.user.email')",
      'isTripOwner',
      "'owner' in data.ref('trip.tripUser.role') && auth.email in data.ref('trip.tripUser.user.email')",
      'isTripViewer',
      "'viewer' in data.ref('trip.tripUser.role') && auth.email in data.ref('trip.tripUser.user.email')",
    ],
    allow: {
      view: 'isTripViewer || isTripEditor || isTripOwner',
      create: 'isTripEditor || isTripOwner',
      delete: 'isTripEditor || isTripOwner',
      update: 'isTripEditor || isTripOwner',
    },
  },
  accommodation: {
    bind: [
      'isTripEditor',
      "'editor' in data.ref('trip.tripUser.role') && auth.email in data.ref('trip.tripUser.user.email')",
      'isTripOwner',
      "'owner' in data.ref('trip.tripUser.role') && auth.email in data.ref('trip.tripUser.user.email')",
      'isTripViewer',
      "'viewer' in data.ref('trip.tripUser.role') && auth.email in data.ref('trip.tripUser.user.email')",
    ],
    allow: {
      view: 'isTripViewer || isTripEditor || isTripOwner',
      create: 'isTripEditor || isTripOwner',
      delete: 'isTripEditor || isTripOwner',
      update: 'isTripEditor || isTripOwner',
    },
  },
  expense: {
    bind: [
      'isTripEditor',
      "'editor' in data.ref('trip.tripUser.role') && auth.email in data.ref('trip.tripUser.user.email')",
      'isTripOwner',
      "'owner' in data.ref('trip.tripUser.role') && auth.email in data.ref('trip.tripUser.user.email')",
      'isTripViewer',
      "'viewer' in data.ref('trip.tripUser.role') && auth.email in data.ref('trip.tripUser.user.email')",
    ],
    allow: {
      view: 'isTripEditor || isTripOwner',
      create: 'isTripEditor || isTripOwner',
      delete: 'isTripEditor || isTripOwner',
      update: 'isTripEditor || isTripOwner',
    },
  },
  tripUser: {
    bind: [
      'isTripEditor',
      "'editor' in data.ref('trip.tripUser.role') && auth.email in data.ref('trip.tripUser.user.email')",
      'isTripOwner',
      "'owner' in data.ref('trip.tripUser.role') && auth.email in data.ref('trip.tripUser.user.email')",
      'isTripViewer',
      "'viewer' in data.ref('trip.tripUser.role') && auth.email in data.ref('trip.tripUser.user.email')",
    ],
    allow: {
      view: 'isTripEditor || isTripOwner',
      create: 'isTripOwner',
      delete: 'isTripOwner',
      update: 'isTripOwner',
    },
  },
};
