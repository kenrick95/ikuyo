import '@radix-ui/themes/styles.css';
import './accent.css';

import { Portal, Theme } from '@radix-ui/themes';
import React from 'react';
import { flushSync } from 'react-dom';
import { type AroundNavHandler, Redirect, Route, Router, Switch } from 'wouter';
import s from './App.module.css';
import {
  useRedirectUnauthenticatedRoutes,
  useSubscribeUser,
} from './Auth/hooks';
import { DialogRoot } from './Dialog/DialogRoot';
import { withLoading } from './Loading/withLoading';
import {
  RouteAccount,
  RouteLanding,
  RouteLogin,
  RoutePrivacy,
  RouteTerms,
  RouteTrip,
  RouteTrips,
} from './Routes/routes';
import { ImperativeToastRoot } from './Toast/ImperativeToast';
import { ThemeAppearance } from './theme/constants';
import { useSubscribeTheme, useTheme } from './theme/hooks';

const PageLanding = withLoading()(
  React.lazy(() => import('./Landing/PageLanding')),
);
const PageTerms = withLoading()(React.lazy(() => import('./Docs/Terms')));
const PagePrivacy = withLoading()(React.lazy(() => import('./Docs/Privacy')));
const PageLogin = withLoading()(React.lazy(() => import('./Auth/Auth')));
const PageTrips = withLoading()(React.lazy(() => import('./Trips/PageTrips')));
const PageTrip = withLoading()(React.lazy(() => import('./Trip/PageTrip')));
const PageAccount = withLoading()(
  React.lazy(() => import('./Account/PageAccount')),
);
const PageDemo = withLoading()(React.lazy(() => import('./PageDemo')));

// Handle view transitions for route changes
let pendingTransition: ViewTransition | null = null;

const aroundNav: AroundNavHandler = (navigate, to, options) => {
  if (!document.startViewTransition || document.visibilityState === 'hidden') {
    // check if supported and document is visible
    navigate(to, options);
    return;
  }

  // Skip transition if one is already in progress
  if (pendingTransition) {
    pendingTransition.skipTransition();
    pendingTransition = null;
  }

  try {
    pendingTransition = document.startViewTransition(() => {
      flushSync(() => {
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
        pendingTransition = null;
      });
  } catch {
    // Fallback to regular navigation if transition fails
    pendingTransition = null;
    navigate(to, options);
  }
};

function App() {
  useSubscribeTheme();
  const theme = useTheme();
  useSubscribeUser();
  useRedirectUnauthenticatedRoutes();

  return (
    <>
      <Theme appearance={theme} accentColor="red">
        <Router aroundNav={aroundNav}>
          <Switch>
            {import.meta.env.DEV ? (
              <Route path={'/demo'} component={PageDemo} />
            ) : null}
            <Route path={RouteLogin.routePath} component={PageLogin} />
            <Route path={RouteTrips.routePath} component={PageTrips} />
            <Route path={RouteTrip.routePath} component={PageTrip} nest />
            <Route path={RouteAccount.routePath} component={PageAccount} />
            <Route path={RoutePrivacy.routePath} component={PagePrivacy} />
            <Route path={RouteTerms.routePath} component={PageTerms} />
            <Route path={RouteLanding.routePath} component={PageLanding} />
            <Route>
              <Redirect to={RouteLanding.routePath} />
            </Route>
          </Switch>
          <DialogRoot />
        </Router>
      </Theme>
      <Portal className={s.notificationArea} asChild>
        <Theme
          appearance={theme === ThemeAppearance.Dark ? 'dark' : 'light'}
          accentColor="red"
        >
          <ImperativeToastRoot />
        </Theme>
      </Portal>
    </>
  );
}

export default App;
