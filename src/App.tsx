import './App.css';
import { db } from './data/db';
import { NewActivityForm } from './Event/Activity';
import { Timeline } from './Event/Timeline';

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
    <>
      <NewActivityForm />
      <Timeline activities={data.activities} />
    </>
  );
}

export default App;
