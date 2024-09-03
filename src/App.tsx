import './App.css';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { db } from './data/db';
import { TriggerNewActivity } from './Event/Activity';
import { Timeline } from './Event/Timeline';

const theme = createTheme({
  colorSchemes: {
    dark: true,
  },
});

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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TriggerNewActivity />
      <Timeline activities={data.activities} />
    </ThemeProvider>
  );
}

export default App;
