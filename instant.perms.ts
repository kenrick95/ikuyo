export default {
  trip: {
    bind: ['isInvolved', "auth.email in data.ref('user.email')"],
    allow: {
      view: 'isInvolved',
      create: 'isInvolved',
      delete: 'isInvolved',
      update: 'isInvolved',
    },
  },
  user: {
    bind: ['isOwner', 'auth.email == data.email'],
    allow: {
      view: 'isOwner',
      create: 'isOwner',
      delete: 'isOwner',
      update: 'isOwner',
    },
  },
  attrs: {
    allow: {
      create: 'false',
      delete: 'false',
      update: 'false',
    },
  },
  activity: {
    bind: ['isInvolved', "auth.email in data.ref('trip.user.email')"],
    allow: {
      view: 'isInvolved',
      create: 'isInvolved',
      delete: 'isInvolved',
      update: 'isInvolved',
    },
  },
};
