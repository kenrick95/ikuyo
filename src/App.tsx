import './App.css';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import { ThemeProvider } from 'next-themes';

import { ImperativeToastRoot } from './Toast/ImperativeToast';

import { AuthScreen } from './Auth/Auth';

function App() {
  return (
    <ThemeProvider attribute="class">
      <Theme accentColor="plum">
        <ImperativeToastRoot />
        <AuthScreen />
      </Theme>
    </ThemeProvider>
  );
}

export default App;
