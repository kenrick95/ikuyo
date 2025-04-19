import '@radix-ui/themes/styles.css';
import './accent.css';
import { Portal, Theme } from '@radix-ui/themes';
import React from 'react';
import { Redirect, Route, Switch } from 'wouter';
import s from './App.module.css';
import { withLoading } from './Loading/withLoading';
import { ImperativeToastRoot } from './Toast/ImperativeToast';
import { ROUTES } from './routes';
import { ThemeAppearance, useTheme } from './theme';

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
  return (
    <>
      <Theme
        appearance={theme === ThemeAppearance.Dark ? 'dark' : 'light'}
        accentColor="red"
      >
        <Switch>
          <Route path={ROUTES.Login} component={PageLogin} />
          <Route path={ROUTES.Trips} component={PageTrips} />
          <Route path={ROUTES.Trip} component={PageTrip} nest />
          <Route path={ROUTES.Account} component={PageAccount} />
          <Route path={ROUTES.Privacy} component={PagePrivacy} />
          <Route path={ROUTES.Terms} component={PageTerms} />
          <Route>
            <Redirect to={ROUTES.Login} />
          </Route>
        </Switch>
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
