import '@radix-ui/themes/styles.css';
import s from './App.module.css';
import { Theme, Text, Portal } from '@radix-ui/themes';
import { Switch, Route, Redirect } from 'wouter';
import { ImperativeToastRoot } from './Toast/ImperativeToast';
import React, { Suspense } from 'react';
import { ROUTES } from './routes';
import { ThemeAppearance, useTheme } from './theme';

const PageLogin = withLoading(React.lazy(() => import('./Auth/Auth')));
const PageTrips = withLoading(React.lazy(() => import('./Trip/PageTrips')));
const PageTrip = withLoading(React.lazy(() => import('./Trip/PageTrip')));

function withLoading<T extends object>(Component: React.ComponentType<T>) {
  return (props: T) => {
    return (
      <Suspense fallback={<Text size="3">Loading...</Text>}>
        <Component {...props} />
      </Suspense>
    );
  };
}
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
