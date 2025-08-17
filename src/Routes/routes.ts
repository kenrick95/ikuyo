import { createRouteParam, identity, replaceId } from './definition';

export const RouteLogin = createRouteParam('/login', identity);
export const RouteTrips = createRouteParam('/trip', identity);
export const RouteTrip = createRouteParam('/trip/:id', replaceId);
export const RouteAccount = createRouteParam('/account/edit', identity);
export const RoutePrivacy = createRouteParam('/privacy', identity);
export const RouteTerms = createRouteParam('/terms', identity);
export const RouteLanding = createRouteParam('/landing', identity);

export const UnauthenticatedRoutes = [
  RouteLogin,
  RoutePrivacy,
  RouteTerms,
  RouteLanding,
];

// #region Trip
export const RouteTripHome = createRouteParam('/home', identity, RouteTrip);
export const RouteTripListView = createRouteParam('/list', identity, RouteTrip);
export const RouteTripTimetableView = createRouteParam(
  '/timetable',
  identity,
  RouteTrip,
);
export const RouteTripMap = createRouteParam('/map', identity, RouteTrip);
export const RouteTripExpenses = createRouteParam(
  '/expenses',
  identity,
  RouteTrip,
);
export const RouteTripComment = createRouteParam(
  '/comment',
  identity,
  RouteTrip,
);
export const RouteTripTaskList = createRouteParam(
  '/tasks',
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

// #region Trip Task
export const RouteTripTaskListTask = createRouteParam(
  '/task/:id',
  replaceId,
  RouteTripTaskList,
);
// #endregion Trip Timetable