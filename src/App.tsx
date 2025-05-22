import '@radix-ui/themes/styles.css';
import './accent.css';

import { Portal, Theme } from '@radix-ui/themes';
import React from 'react';
import { Redirect, Route, Switch } from 'wouter';
import s from './App.module.css';
import {
  useRedirectUnauthenticatedRoutes,
  useSubscribeUser,
} from './Auth/hooks';
import { DialogRoot } from './Dialog/DialogRoot';
import { withLoading } from './Loading/withLoading';
import {
  RouteAccount,
  RouteLogin,
  RoutePrivacy,
  RouteTerms,
  RouteTrip,
  RouteTrips,
} from './Routes/routes';
import { ImperativeToastRoot } from './Toast/ImperativeToast';
import { ThemeAppearance, useTheme } from './theme';

const PageTerms = withLoading()(React.lazy(() => import('./Docs/Terms')));
const PagePrivacy = withLoading()(React.lazy(() => import('./Docs/Privacy')));
const PageLogin = withLoading()(React.lazy(() => import('./Auth/Auth')));
const PageTrips = withLoading()(
  React.lazy(() => import('./Trip/Trips/PageTrips')),
);
const PageTrip = withLoading()(React.lazy(() => import('./Trip/PageTrip')));
const PageAccount = withLoading()(
  React.lazy(() => import('./Account/PageAccount')),
);

function App() {
  const theme = useTheme();
  useSubscribeUser();
  useRedirectUnauthenticatedRoutes();

  return (
    <>
      <Theme appearance={theme} accentColor="red">
        <Switch>
          <Route path={RouteLogin.routePath} component={PageLogin} />
          <Route path={RouteTrips.routePath} component={PageTrips} />
          <Route path={RouteTrip.routePath} component={PageTrip} nest />
          <Route path={RouteAccount.routePath} component={PageAccount} />
          <Route path={RoutePrivacy.routePath} component={PagePrivacy} />
          <Route path={RouteTerms.routePath} component={PageTerms} />
          <Route>
            <Redirect to={RouteLogin.routePath} />
          </Route>
        </Switch>
        <DialogRoot />
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
