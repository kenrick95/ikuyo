import '@radix-ui/themes/styles.css';
import './accent.css';

import { Theme } from '@radix-ui/themes';
import React, { useCallback } from 'react';
import { flushSync } from 'react-dom';
import { type AroundNavHandler, Redirect, Route, Router, Switch } from 'wouter';
import {
  useRedirectUnauthenticatedRoutes,
  useSubscribeUser,
} from './Auth/hooks';
import { DialogRoot } from './Dialog/DialogRoot';
import { maintenanceMode, readOnlyMode } from './data/backendConfig';
import { useBoundStore } from './data/store';
import { withLoading } from './Loading/withLoading';
import { PageMaintenance } from './Maintenance/PageMaintenance';
import { ReadOnlyBanner } from './Maintenance/ReadOnlyBanner';
import {
  RouteAccount,
  RouteAccountUpgrade,
  RouteLanding,
  RouteLogin,
  RoutePrivacy,
  RouteTerms,
  RouteTrip,
  RouteTripNew,
  RouteTrips,
  RouteTripsPublic,
} from './Routes/routes';
import { ImperativeToastRoot } from './Toast/ImperativeToast';
import { GoatCounterTelemetry } from './telemetry/GoatCounterTelemetry';
import { useSubscribeTheme, useTheme } from './theme/hooks';
import { WebMCPTools } from './webmcp/WebMCPTools';

const PageLanding = withLoading()(
  React.lazy(() => import('./Landing/PageLanding')),
);
const PageTerms = withLoading()(React.lazy(() => import('./Docs/Terms')));
const PagePrivacy = withLoading()(React.lazy(() => import('./Docs/Privacy')));
const PageLogin = withLoading()(React.lazy(() => import('./Auth/Auth')));
const PageTrips = withLoading()(React.lazy(() => import('./Trips/PageTrips')));
const PageTripsPublic = withLoading()(
  React.lazy(() => import('./TripsPublic/PageTripsPublic')),
);
const PageTripNew = withLoading()(
  React.lazy(() => import('./Trip/TripNew/PageTripNew')),
);
const PageTrip = withLoading()(React.lazy(() => import('./Trip/PageTrip')));
const PageAccount = withLoading()(
  React.lazy(() => import('./Account/PageAccount')),
);
const PageAccountUpgrade = withLoading()(
  React.lazy(() => import('./Account/PageAccountUpgrade')),
);
const PageDemo = withLoading()(React.lazy(() => import('./PageDemo')));

// Handle view transitions for route changes
let pendingTransition: ViewTransition | null = null;

function App() {
  useSubscribeTheme();
  const theme = useTheme();
  useSubscribeUser();
  useRedirectUnauthenticatedRoutes();

  const clearDialogs = useBoundStore((state) => state.clearDialogs);
  const aroundNav: AroundNavHandler = useCallback(
    // aroundNav also clear all dialogs before navigating to a new route, to avoid leaving dialogs open when the route changes.
    (navigate, to, options) => {
      // Skip transition if not supported, or hidden document, or prefer-reduced-motion is enabled
      if (
        !document.startViewTransition ||
        document.visibilityState === 'hidden' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        // Disable on trip list & trip timetable dialog routes (to/from) as they compete with Radix's own default transition, causing unpleasant blinking effect
        to?.includes('/list/') ||
        to?.includes('/timetable/') ||
        location.pathname?.includes('/list/') ||
        location.pathname?.includes('/timetable/')
      ) {
        // check if supported and document is visible
        console.log('[VT] View transition skipped');
        clearDialogs();
        navigate(to, options);
        return;
      }

      // Skip transition if one is already in progress
      if (pendingTransition) {
        console.log('[VT] View transition skipped due to pending transition');
        try {
          pendingTransition.skipTransition();
          pendingTransition = null;
        } catch (error) {
          // Silently ignore AbortError from skipTransition()
          if ((error as Error)?.name !== 'AbortError') {
            throw error;
          }
        }
      }

      try {
        console.log('[VT] View transition starting');
        pendingTransition = document.startViewTransition(() => {
          flushSync(() => {
            clearDialogs();
            navigate(to, options);
          });
        });

        pendingTransition.finished
          .catch((error) => {
            // Silently ignore AbortError from skipTransition()
            if (error.name !== 'AbortError') {
              throw error;
            }
          })
          .finally(() => {
            console.log('[VT] View transition done');
            pendingTransition = null;
          });
      } catch {
        console.log(
          '[VT] View transition failed, falling back to regular navigation',
        );
        // Fallback to regular navigation if transition fails
        pendingTransition = null;
        clearDialogs();
        navigate(to, options);
      }
    },
    [clearDialogs],
  );

  // Full-site maintenance mode replaces the router + auth UI entirely. All hooks
  // above still run unconditionally (React rule), but no routes are rendered and
  // no writes can happen. `maintenanceMode` is a build-time constant, so this
  // branch is stable across renders for a given build.
  if (maintenanceMode) {
    return (
      <Theme appearance={theme} accentColor="red">
        <PageMaintenance />
      </Theme>
    );
  }

  return (
    <>
      <Theme appearance={theme} accentColor="red">
        {readOnlyMode ? <ReadOnlyBanner /> : null}
        <Router aroundNav={aroundNav}>
          <Switch>
            {import.meta.env.DEV ? (
              <Route path={'/demo'} component={PageDemo} />
            ) : null}
            <Route path={RouteLogin.routePath} component={PageLogin} />
            <Route path={RouteTrips.routePath} component={PageTrips} />
            <Route
              path={RouteTripsPublic.routePath}
              component={PageTripsPublic}
            />
            <Route path={RouteTripNew.routePath} component={PageTripNew} />
            <Route path={RouteTrip.routePath} component={PageTrip} nest />
            <Route path={RouteAccount.routePath} component={PageAccount} />
            <Route
              path={RouteAccountUpgrade.routePath}
              component={PageAccountUpgrade}
            />
            <Route path={RoutePrivacy.routePath} component={PagePrivacy} />
            <Route path={RouteTerms.routePath} component={PageTerms} />
            <Route path={RouteLanding.routePath} component={PageLanding} />
            <Route>
              <Redirect to={RouteLanding.routePath} />
            </Route>
          </Switch>
          <DialogRoot />
          <GoatCounterTelemetry />
          <WebMCPTools />
        </Router>
      </Theme>
      <ImperativeToastRoot />
    </>
  );
}

export default App;
