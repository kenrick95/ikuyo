export const ROUTES = {
  Login: '/login',
  Trips: '/trip',
  Trip: {
    asRoute: (id: string) => '/trip/:id'.replace(':id', id),
    raw: '/trip/:id',
  },
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
  AccommodationDelete: '/accommodation/:id/delete',
  AccommodationEdit: '/accommodation/:id/edit',
  Accommodation: '/accommodation/:id',
  ActivityNew: '/activity/new',
  ActivityDelete: '/activity/:id/delete',
  ActivityEdit: '/activity/:id/edit',
  Activity: '/activity/:id',
  MacroplanNew: '/macroplan/new',
  MacroplanDelete: '/macroplan/:id/delete',
  MacroplanEdit: '/macroplan/:id/edit',
  Macroplan: '/macroplan/:id',
} as const;
