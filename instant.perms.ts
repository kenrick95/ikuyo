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
      'isTripPublic',
      'data.sharingLevel == 2',
      'isTripEditor',
      "'editor' in data.ref('tripUser.role') && auth.email in data.ref('tripUser.user.email')",
      'isTripOwner',
      "'owner' in data.ref('tripUser.role') && auth.email in data.ref('tripUser.user.email')",
      'isTripViewer',
      "'viewer' in data.ref('tripUser.role') && auth.email in data.ref('tripUser.user.email')",
    ],
    allow: {
      view: 'isTripPublic || isTripViewer || isTripEditor || isTripOwner',
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
      'isTripPublic',
      "2 in data.ref('trip.sharingLevel')",
      'isTripEditor',
      "'editor' in data.ref('trip.tripUser.role') && auth.email in data.ref('trip.tripUser.user.email')",
      'isTripOwner',
      "'owner' in data.ref('trip.tripUser.role') && auth.email in data.ref('trip.tripUser.user.email')",
      'isTripViewer',
      "'viewer' in data.ref('trip.tripUser.role') && auth.email in data.ref('trip.tripUser.user.email')",
    ],
    allow: {
      view: 'isTripPublic || isTripViewer || isTripEditor || isTripOwner',
      create: 'isTripEditor || isTripOwner',
      delete: 'isTripEditor || isTripOwner',
      update: 'isTripEditor || isTripOwner',
    },
  },
  macroplan: {
    bind: [
      'isTripPublic',
      "2 in data.ref('trip.sharingLevel')",
      'isTripEditor',
      "'editor' in data.ref('trip.tripUser.role') && auth.email in data.ref('trip.tripUser.user.email')",
      'isTripOwner',
      "'owner' in data.ref('trip.tripUser.role') && auth.email in data.ref('trip.tripUser.user.email')",
      'isTripViewer',
      "'viewer' in data.ref('trip.tripUser.role') && auth.email in data.ref('trip.tripUser.user.email')",
    ],
    allow: {
      view: 'isTripPublic || isTripViewer || isTripEditor || isTripOwner',
      create: 'isTripEditor || isTripOwner',
      delete: 'isTripEditor || isTripOwner',
      update: 'isTripEditor || isTripOwner',
    },
  },
  accommodation: {
    bind: [
      'isTripPublic',
      " 2 in data.ref('trip.sharingLevel')",
      'isTripEditor',
      "'editor' in data.ref('trip.tripUser.role') && auth.email in data.ref('trip.tripUser.user.email')",
      'isTripOwner',
      "'owner' in data.ref('trip.tripUser.role') && auth.email in data.ref('trip.tripUser.user.email')",
      'isTripViewer',
      "'viewer' in data.ref('trip.tripUser.role') && auth.email in data.ref('trip.tripUser.user.email')",
    ],
    allow: {
      view: 'isTripPublic || isTripViewer || isTripEditor || isTripOwner',
      create: 'isTripEditor || isTripOwner',
      delete: 'isTripEditor || isTripOwner',
      update: 'isTripEditor || isTripOwner',
    },
  },
  expense: {
    bind: [
      'isTripPublic',
      "2 in data.ref('trip.sharingLevel')",
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
  commentGroup: {
    bind: [
      'isTripPublic',
      "2 in data.ref('trip.sharingLevel')",
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
  comment: {
    bind: [
      'isTripPublic',
      "2 in data.ref('group.trip.sharingLevel')",
      'isTripEditor',
      "'editor' in data.ref('group.trip.tripUser.role') && auth.email in data.ref('group.trip.tripUser.user.email')",
      'isTripOwner',
      "'owner' in data.ref('group.trip.tripUser.role') && auth.email in data.ref('group.trip.tripUser.user.email')",
      'isTripViewer',
      "'viewer' in data.ref('group.trip.tripUser.role') && auth.email in data.ref('group.trip.tripUser.user.email')",
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
      'isTripPublic',
      "2 in data.ref('trip.sharingLevel')",
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
