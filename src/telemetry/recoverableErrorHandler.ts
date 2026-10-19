import type { RootOptions } from 'react-dom/client';

type RecoverableErrorHandler = NonNullable<RootOptions['onRecoverableError']>;

export function createRecoverableErrorHandler(
  reportError: RecoverableErrorHandler,
): RecoverableErrorHandler {
  return (error, errorInfo) => {
    // React 19.3 misses Chromium's new hidden-document cancellation message.
    // https://github.com/react/react/issues/37669
    // Match the cancellation itself: the tab may already be visible again.
    if (
      errorInfo.componentStack === null &&
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'InvalidStateError' &&
      'message' in error &&
      error.message ===
        'Transition was aborted because of invalid state. Document hidden'
    ) {
      return;
    }

    reportError(error, errorInfo);
  };
}
