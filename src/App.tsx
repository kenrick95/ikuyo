import './App.css';
import { db } from './data/db';
import { DbActivities } from './data/types';
import { Timeline } from './Event/Timeline';

function App() {
  const { isLoading, error, data } = db.useQuery({
    activities: {} as DbActivities,
  });

  if (isLoading) {
    return <div>Fetching data...</div>;
  }
  if (error) {
    return <div>Error fetching data: {error.message}</div>;
  }

  return (
    <>
      <Timeline activities={data.activities} />
    </>
  );
}

export default App;
