import './index.css';
import { reactErrorHandler, init as sentryInit } from '@sentry/react';
// import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

if (process.env.SENTRY_DSN && process.env.SENTRY_ENABLED) {
  console.log('Sentry is enabled, initializing...');
  sentryInit({
    dsn: process.env.SENTRY_DSN,
    sendDefaultPii: true,
    allowUrls: ['https://ikuyo.kenrick95.org'],
  });
}

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

const createRootConfig: Parameters<typeof createRoot>[1] = process.env
  .SENTRY_ENABLED
  ? ({
      // Callback called when an error is thrown and not caught by an ErrorBoundary.
      onUncaughtError: reactErrorHandler((error, errorInfo) => {
        console.warn('Uncaught error', error, errorInfo.componentStack);
      }),
      // Callback called when React catches an error in an ErrorBoundary.
      onCaughtError: reactErrorHandler(),
      // Callback called when React automatically recovers from errors.
      onRecoverableError: reactErrorHandler(),
    } satisfies Parameters<typeof createRoot>[1])
  : {};

const root = createRoot(
  document.getElementById('root') as HTMLDivElement,
  createRootConfig,
);

root.render(
  // <StrictMode>
  <App />,
  // </StrictMode>,
);
