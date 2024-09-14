export default {
  attrs: {
    allow: {
      create: 'false',
      delete: 'false',
      update: 'false',
    },
  },
  activity: {
    allow: {
      view: 'isInvolved',
      create: 'isInvolved',
      update: 'isInvolved',
      delete: 'isInvolved',
    },
    bind: ['isInvolved', "auth.email in data.ref('trip.user.email')"],
  },
  trip: {
    allow: {
      view: 'true',
      create: 'isInvolved',
      update: 'isInvolved',
      delete: 'isInvolved',
    },
    bind: ['isInvolved', "auth.email in data.ref('user.email')"],
  },
  user: {
    allow: {
      view: 'true',
      create: 'isOwner',
      update: 'isOwner',
      delete: 'isOwner',
    },
    bind: ['isOwner', 'auth.email == data.email'],
  },
};
