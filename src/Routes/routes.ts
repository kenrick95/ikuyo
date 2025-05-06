import { createRouteParam, identity, replaceId } from './definition';

export const RouteLogin = createRouteParam('/login', identity);
export const RouteTrips = createRouteParam('/trip', identity);
export const RouteTrip = createRouteParam('/trip/:id', replaceId);
export const RouteAccount = createRouteParam('/account/edit', identity);
export const RoutePrivacy = createRouteParam('/privacy', identity);
export const RouteTerms = createRouteParam('/terms', identity);

// #region Trip
export const RouteTripListView = createRouteParam('/list', identity, RouteTrip);
export const RouteTripTimetableView = createRouteParam(
  '/timetable',
  identity,
  RouteTrip,
);
export const RouteTripExpenses = createRouteParam(
  '/expenses',
  identity,
  RouteTrip,
);
// #endregion Trip
// #region Trip Timetable
export const RouteTripTimetableViewActivity = createRouteParam(
  '/activity/:id',
  replaceId,
  RouteTripTimetableView,
);
export const RouteTripTimetableViewAccommodation = createRouteParam(
  '/accommodation/:id',
  replaceId,
  RouteTripTimetableView,
);
export const RouteTripTimetableViewMacroplan = createRouteParam(
  '/macroplan/:id',
  replaceId,
  RouteTripTimetableView,
);
// #endregion Trip Timetable
// #region Trip List
export const RouteTripListViewActivity = createRouteParam(
  '/activity/:id',
  replaceId,
  RouteTripListView,
);
export const RouteTripListViewAccommodation = createRouteParam(
  '/accommodation/:id',
  replaceId,
  RouteTripListView,
);
export const RouteTripListViewMacroplan = createRouteParam(
  '/macroplan/:id',
  replaceId,
  RouteTripListView,
);
// #endregion Trip List
