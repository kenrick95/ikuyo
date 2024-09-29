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
      'isTripViewer',
      "auth.email in data.ref('viewer.email')",
      'isTripEditor',
      "auth.email in data.ref('editor.email')",
      'isTripOwner',
      "auth.email in data.ref('owner.email')",
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
      create: 'true',
      delete: 'false',
      update: 'true',
    },
  },
  activity: {
    bind: [
      'isTripViewer',
      "auth.email in data.ref('trip.viewer.email')",
      'isTripEditor',
      "auth.email in data.ref('trip.editor.email')",
      'isTripOwner',
      "auth.email in data.ref('trip.owner.email')",
    ],
    allow: {
      view: 'isTripViewer || isTripEditor || isTripOwner',
      create: 'isTripEditor || isTripOwner',
      delete: 'isTripEditor || isTripOwner',
      update: 'isTripEditor || isTripOwner',
    },
  },
};
