import '@radix-ui/themes/styles.css';
import './accent.css';

import { Spinner, Theme } from '@radix-ui/themes';
import React, { Suspense } from 'react';
import { Redirect, Route, Switch } from 'wouter';
import {
  useRedirectUnauthenticatedRoutes,
  useSubscribeUser,
} from './Auth/hooks';
import { DialogRoot } from './Dialog/DialogRoot';
import { maintenanceMode, readOnlyMode } from './data/backendConfig';
import { useBoundStore } from './data/store';
import { RouteTransition } from './Routes/RouteTransition';
import { TransitionRouter } from './Routes/TransitionRouter';
import './Routes/transitions.css';
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
  RouteTripsArchived,
  RouteTripsPublic,
} from './Routes/routes';
import { ImperativeToastRoot } from './Toast/ImperativeToast';
import { GoatCounterTelemetry } from './telemetry/GoatCounterTelemetry';
import { useSubscribeTheme, useTheme } from './theme/hooks';
import { WebMCPTools } from './webmcp/WebMCPTools';

const PageLanding = React.lazy(() => import('./Landing/PageLanding'));
const PageTerms = React.lazy(() => import('./Docs/Terms'));
const PagePrivacy = React.lazy(() => import('./Docs/Privacy'));
const PageLogin = React.lazy(() => import('./Auth/Auth'));
const PageTrips = React.lazy(() => import('./Trips/PageTrips'));
const PageTripsArchived = React.lazy(() => import('./Trips/PageTripsArchived'));
const PageTripsPublic = React.lazy(
  () => import('./TripsPublic/PageTripsPublic'),
);
const PageTripNew = React.lazy(() => import('./Trip/TripNew/PageTripNew'));
const PageTrip = React.lazy(() => import('./Trip/PageTrip'));
const PageAccount = React.lazy(() => import('./Account/PageAccount'));
const PageAccountUpgrade = React.lazy(
  () => import('./Account/PageAccountUpgrade'),
);
const PageDemo = React.lazy(() => import('./PageDemo'));

function AuthRedirect() {
  useRedirectUnauthenticatedRoutes();
  return null;
}

function App() {
  useSubscribeTheme();
  const theme = useTheme();
  useSubscribeUser();
  const clearDialogs = useBoundStore((state) => state.clearDialogs);

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
        <TransitionRouter
          beforeNavigate={clearDialogs}
          transitions={process.env.IKUYO_VIEW_TRANSITIONS !== false}
        >
          <AuthRedirect />
          <Suspense fallback={<Spinner m="3" />}>
            <RouteTransition default="vt-content">
              <Switch>
                {import.meta.env.DEV ? (
                  <Route path={'/demo'} component={PageDemo} />
                ) : null}
                <Route path={RouteLogin.routePath} component={PageLogin} />
                <Route path={RouteTrips.routePath} component={PageTrips} />
                <Route
                  path={RouteTripsArchived.routePath}
                  component={PageTripsArchived}
                />
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
            </RouteTransition>
          </Suspense>
          <DialogRoot />
          <GoatCounterTelemetry />
          <WebMCPTools />
        </TransitionRouter>
      </Theme>
      <ImperativeToastRoot />
    </>
  );
}

export default App;
