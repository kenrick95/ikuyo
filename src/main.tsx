import './index.css';
// import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

/** Delete all service worker generated from previous build tooling... It was kind of unnecessarily complicated since fetching data still need internet connection, maybe we don't need it for now... */
async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    if (navigator.serviceWorker.getRegistrations) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        console.log('Unregistering service worker for:', reg.scope);
        await reg.unregister();
      }
    } else {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        console.log('Unregistering service worker');
        await registration.unregister();
      }
    }
  }
}
setTimeout(() => {
  unregisterServiceWorker().catch((error) => {
    console.error('Failed to unregister service worker:', error);
  });
}, 1000);

const root = createRoot(document.getElementById('root') as HTMLDivElement);

root.render(
  // <StrictMode>
  <App />,
  // </StrictMode>,
);
