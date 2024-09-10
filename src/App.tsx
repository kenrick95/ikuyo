import './App.css';
import '@radix-ui/themes/styles.css';
import { Container, Theme } from '@radix-ui/themes';
import { ThemeProvider } from 'next-themes';

import { db } from './data/db';
import { Timeline } from './Event/Timeline';
import { ImperativeToastRoot } from './Toast/ImperativeToast';

import { Navbar } from './Nav/Navbar';

function App() {
  const { isLoading, error, data } = db.useQuery({
    user: {
      $: {
        where: {
          handle: 'kenrick',
        },
      },
      trip: {
        activity: {},
      },
    },
  });

  if (isLoading) {
    return <div>Fetching data...</div>;
  }
  if (error) {
    return <div>Error fetching data: {error.message}</div>;
  }

  // Let's focus on 1 user and 1 trip for now
  console.log('data', data);

  const trip = data.user[0]?.trip[0];
  const activities = trip.activity;

  return (
    <ThemeProvider attribute="class">
      <Theme accentColor="ruby">
        <Navbar trip={trip} />
        <ImperativeToastRoot />
        <Container>
          <Timeline activities={activities} />
        </Container>
      </Theme>
    </ThemeProvider>
  );
}

export default App;
