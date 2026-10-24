import type { ErrorInfo } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createRecoverableErrorHandler } from './recoverableErrorHandler';

const hiddenDocumentMessage =
  'Transition was aborted because of invalid state. Document hidden';
const viewportChangedMessage =
  'Transition was aborted because of invalid state. Viewport size changed';
// React's view-transition errors have a null stack, despite the public type.
const viewTransitionErrorInfo = {
  componentStack: null,
} as unknown as ErrorInfo;

afterEach(() => vi.restoreAllMocks());

describe('createRecoverableErrorHandler', () => {
  test.each(['hidden', 'visible'] as const)(
    'ignores the viewport-resize cancellation when the tab is now %s',
    (visibility) => {
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(visibility);
      const reportError = vi.fn();
      const handleError = createRecoverableErrorHandler(reportError);

      handleError(
        new DOMException(viewportChangedMessage, 'InvalidStateError'),
        viewTransitionErrorInfo,
      );

      expect(reportError).not.toHaveBeenCalled();
    },
  );

  test.each(['hidden', 'visible'] as const)(
    'ignores the hidden-document cancellation when the tab is now %s',
    (visibility) => {
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(visibility);
      const reportError = vi.fn();
      const handleError = createRecoverableErrorHandler(reportError);

      handleError(
        new DOMException(hiddenDocumentMessage, 'InvalidStateError'),
        viewTransitionErrorInfo,
      );

      expect(reportError).not.toHaveBeenCalled();
    },
  );

  test.each([
    new DOMException('Duplicate view-transition-name', 'InvalidStateError'),
    new DOMException(
      'Transition was aborted because of invalid state. Unknown reason',
      'InvalidStateError',
    ),
    new DOMException(hiddenDocumentMessage, 'AbortError'),
    new DOMException(viewportChangedMessage, 'AbortError'),
    new Error(hiddenDocumentMessage),
    new Error(viewportChangedMessage),
    new Error('Hydration failed'),
    hiddenDocumentMessage,
    null,
    undefined,
  ])('reports other recoverable errors unchanged: %s', (error) => {
    const reportError = vi.fn();
    const handleError = createRecoverableErrorHandler(reportError);
    const errorInfo = viewTransitionErrorInfo;

    handleError(error, errorInfo);

    expect(reportError).toHaveBeenCalledExactlyOnceWith(error, errorInfo);
  });

  test('reports other errors even while the document is hidden', () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    const reportError = vi.fn();
    const handleError = createRecoverableErrorHandler(reportError);
    const error = new Error('Hydration failed');
    const errorInfo = viewTransitionErrorInfo;

    handleError(error, errorInfo);

    expect(reportError).toHaveBeenCalledExactlyOnceWith(error, errorInfo);
  });

  test.each([hiddenDocumentMessage, viewportChangedMessage])(
    'reports matching errors associated with a component: %s',
    (message) => {
      const reportError = vi.fn();
      const handleError = createRecoverableErrorHandler(reportError);
      const error = new DOMException(message, 'InvalidStateError');
      const errorInfo = { componentStack: '\n    at Login' };

      handleError(error, errorInfo);

      expect(reportError).toHaveBeenCalledExactlyOnceWith(error, errorInfo);
    },
  );
});
