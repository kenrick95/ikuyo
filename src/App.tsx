import '@radix-ui/themes/styles.css';
import s from './App.module.css';
import { Theme, Portal } from '@radix-ui/themes';
import { Switch, Route, Redirect } from 'wouter';
import { ImperativeToastRoot } from './Toast/ImperativeToast';
import React from 'react';
import { ROUTES } from './routes';
import { ThemeAppearance, useTheme } from './theme';
import { withLoading } from './Loading/withLoading';

const PageLogin = withLoading()(React.lazy(() => import('./Auth/Auth')));
const PageTrips = withLoading()(React.lazy(() => import('./Trip/PageTrips')));
const PageTrip = withLoading()(React.lazy(() => import('./Trip/PageTrip')));
const PageAccount = withLoading()(
  React.lazy(() => import('./Account/PageAccount'))
);

function App() {
  const theme = useTheme();
  return (
    <>
      <Theme
        appearance={theme === ThemeAppearance.Dark ? 'dark' : 'light'}
        accentColor="plum"
      >
        <Switch>
          <Route path={ROUTES.Login} component={PageLogin} />
          <Route path={ROUTES.Trips} component={PageTrips} />
          <Route path={ROUTES.Trip} component={PageTrip} />
          <Route path={ROUTES.Account} component={PageAccount} />
          <Route>
            <Redirect to={ROUTES.Login} />
          </Route>
        </Switch>
      </Theme>
      <Portal className={s.notificationArea} asChild>
        <Theme
          appearance={theme === ThemeAppearance.Dark ? 'dark' : 'light'}
          accentColor="plum"
        >
          <ImperativeToastRoot />
        </Theme>
      </Portal>
    </>
  );
}

export default App;
