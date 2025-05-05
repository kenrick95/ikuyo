import '@radix-ui/themes/styles.css';
import './accent.css';
import './maptiler/init';

import { Portal, Theme } from '@radix-ui/themes';
import React, { useEffect } from 'react';
import { Redirect, Route, Switch, useLocation } from 'wouter';
import s from './App.module.css';
import { DialogRoot } from './Dialog/DialogRoot';
import { withLoading } from './Loading/withLoading';
import { ImperativeToastRoot } from './Toast/ImperativeToast';
import { ROUTES } from './Routes/routes';
import { ThemeAppearance, useTheme } from './theme';
import { useBoundStore } from './data/store';

const PageTerms = withLoading()(React.lazy(() => import('./Docs/Terms')));
const PagePrivacy = withLoading()(React.lazy(() => import('./Docs/Privacy')));
const PageLogin = withLoading()(React.lazy(() => import('./Auth/Auth')));
const PageTrips = withLoading()(React.lazy(() => import('./Trip/PageTrips')));
const PageTrip = withLoading()(React.lazy(() => import('./Trip/PageTrip')));
const PageAccount = withLoading()(
  React.lazy(() => import('./Account/PageAccount')),
);

function App() {
  const theme = useTheme();
  const [location] = useLocation();
  const pushRouteHistory = useBoundStore((state) => state.pushRouteHistory);
  useEffect(() => {
    // How to get notified when the location pops?
    // https://github.com/molefrog/wouter/blob/v3/packages/wouter/src/use-browser-location.js
    pushRouteHistory(location);
  }, [location, pushRouteHistory]);

  return (
    <>
      <Theme
        appearance={theme === ThemeAppearance.Dark ? 'dark' : 'light'}
        accentColor="red"
      >
        <Switch>
          <Route path={ROUTES.Login} component={PageLogin} />
          <Route path={ROUTES.Trips} component={PageTrips} />
          <Route path={ROUTES.Trip.raw} component={PageTrip} nest />
          <Route path={ROUTES.Account} component={PageAccount} />
          <Route path={ROUTES.Privacy} component={PagePrivacy} />
          <Route path={ROUTES.Terms} component={PageTerms} />
          <Route>
            <Redirect to={ROUTES.Login} />
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
