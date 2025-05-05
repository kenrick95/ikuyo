interface Route {
  asRoute: (...params: Array<string>) => string;
  raw: string;
}

export const ROUTES = {
  Login: '/login',
  Trips: '/trip',
  Trip: {
    asRoute: (id: string) => '/trip/:id'.replace(':id', id),
    raw: '/trip/:id',
  } satisfies Route,
  Account: '/account/edit',
  Privacy: '/privacy',
  Terms: '/terms',
} as const;
export function asRootRoute(route: string) {
  return `~${route}`;
}
export const ROUTES_TRIP = {
  ListView: '/list',
  TimetableView: '/timetable',
  Expenses: '/expenses',
} as const;
/** shared sub-routes of `/list` and `/timetable` */
export const ROUTES_TRIP_DIALOGS = {
  AccommodationNew: '/accommodation/new',
  AccommodationDelete: {
    raw: '/accommodation/:id/delete',
    asRoute: (id: string) => '/accommodation/:id/delete'.replace(':id', id),
  },
  AccommodationEdit: {
    raw: '/accommodation/:id/edit',
    asRoute: (id: string) => '/accommodation/:id/edit'.replace(':id', id),
  },
  Accommodation: {
    raw: '/accommodation/:id',
    asRoute: (id: string) => '/accommodation/:id'.replace(':id', id),
  },
  ActivityNew: '/activity/new',
  ActivityDelete: {
    raw: '/activity/:id/delete',
    asRoute: (id: string) => '/activity/:id/delete'.replace(':id', id),
  },
  ActivityEdit: {
    raw: '/activity/:id/edit',
    asRoute: (id: string) => '/activity/:id/edit'.replace(':id', id),
  },
  Activity: {
    raw: '/activity/:id',
    asRoute: (id: string) => '/activity/:id'.replace(':id', id),
  },
  MacroplanNew: '/macroplan/new',
  MacroplanDelete: {
    raw: '/macroplan/:id/delete',
    asRoute: (id: string) => '/macroplan/:id/delete'.replace(':id', id),
  },
  MacroplanEdit: {
    raw: '/macroplan/:id/edit',
    asRoute: (id: string) => '/macroplan/:id/edit'.replace(':id', id),
  },
  Macroplan: {
    raw: '/macroplan/:id',
    asRoute: (id: string) => '/macroplan/:id'.replace(':id', id),
  },
} as const;
