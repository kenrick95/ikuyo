import './App.css';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import { ThemeProvider } from 'next-themes';
import { Switch, Route, Redirect } from 'wouter';
import { ImperativeToastRoot } from './Toast/ImperativeToast';

import { PageLogin } from './Auth/Auth';
import { PageTrips } from './Trip/PageTrips';
import { PageTrip } from './Trip/PageTrip';
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
