import './App.css';
import '@radix-ui/themes/styles.css';
import { Theme, Text } from '@radix-ui/themes';
import { ThemeProvider } from 'next-themes';
import { Switch, Route, Redirect } from 'wouter';
import { ImperativeToastRoot } from './Toast/ImperativeToast';
import React, { Suspense } from 'react';

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

import { ROUTES } from './routes';

function App() {
  return (
    <ThemeProvider attribute="class">
      <Theme accentColor="plum">
        <ImperativeToastRoot />
        <Switch>
          <Route path={ROUTES.Login} component={PageLogin} />
          <Route path={ROUTES.Trips} component={PageTrips} />
          <Route path={ROUTES.Trip} component={PageTrip} />
          <Route>
            <Redirect to={ROUTES.Login} />
          </Route>
        </Switch>
      </Theme>
    </ThemeProvider>
  );
}

export default App;
