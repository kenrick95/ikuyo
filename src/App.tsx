import './App.css';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import { ThemeProvider } from 'next-themes';

import { db } from './data/db';
import { TriggerNewActivity } from './Event/Activity';
import { Timeline } from './Event/Timeline';
import { ImperativeToastRoot } from './Toast/ImperativeToast';

function App() {
  const { isLoading, error, data } = db.useQuery({
    activities: {},
  });

  if (isLoading) {
    return <div>Fetching data...</div>;
  }
  if (error) {
    return <div>Error fetching data: {error.message}</div>;
  }

  return (
    <ThemeProvider attribute="class">
      <Theme accentColor="grass">
        <ImperativeToastRoot />
        <TriggerNewActivity />
        <Timeline activities={data.activities} />
      </Theme>
    </ThemeProvider>
  );
}

export default App;
