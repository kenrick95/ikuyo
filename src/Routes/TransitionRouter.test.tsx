import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { lazy, type ReactNode, Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Link, Route, Switch, useLocation, useSearch } from 'wouter';
import {
  isDialogRoute,
  TransitionRouter,
  useRouteSnapshot,
} from './TransitionRouter';

function Snapshot() {
  const [path, navigate] = useLocation();
  const search = useSearch();
  const snapshot = useRouteSnapshot();
  return (
    <>
      <pre data-testid="snapshot">
        {JSON.stringify({
          path,
          search,
          hash: snapshot.hash,
          state: snapshot.state,
        })}
      </pre>
      <button
        type="button"
        onClick={() =>
          navigate('/trip/two/home?tab=day#today', {
            replace: true,
            state: { mode: 'edit' },
          })
        }
      >
        Replace
      </button>
    </>
  );
}

beforeEach(() => {
  window.history.replaceState(null, '', '/trip/one/home');
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, 'startViewTransition');
});

it('shares committed route, search and history state with nested routers', () => {
  const beforeNavigate = vi.fn();
  render(
    <TransitionRouter beforeNavigate={beforeNavigate}>
      <Snapshot />
      <Route path="/trip/:id" nest>
        <Link to="/list">List</Link>
        <Link to="~/landing">Home</Link>
        <Route path="/list">
          <p>Nested list</p>
        </Route>
      </Route>
    </TransitionRouter>,
  );
  const initialLength = history.length;
  fireEvent.click(screen.getByText('List'));
  expect(window.location.pathname).toBe('/trip/one/list');
  expect(history.length).toBe(initialLength + 1);
  expect(screen.getByText('Nested list')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Replace'));
  expect(history.length).toBe(initialLength + 1);
  expect(JSON.parse(screen.getByTestId('snapshot').textContent ?? '')).toEqual({
    path: '/trip/two/home',
    search: 'tab=day',
    hash: '#today',
    state: { mode: 'edit' },
  });
  fireEvent.click(screen.getByText('Home'));
  expect(window.location.pathname).toBe('/landing');
  expect(beforeNavigate).toHaveBeenCalledTimes(3);
});

it('observes direct history and same-path state changes without another history entry', () => {
  render(
    <TransitionRouter>
      <Snapshot />
    </TransitionRouter>,
  );
  const initialLength = history.length;
  act(() => history.replaceState({ dialog: 'new' }, '', '?mode=new#dialog'));
  expect(JSON.parse(screen.getByTestId('snapshot').textContent ?? '')).toEqual({
    path: '/trip/one/home',
    search: 'mode=new',
    hash: '#dialog',
    state: { dialog: 'new' },
  });
  expect(history.length).toBe(initialLength);
});

it('restores back/forward navigation', async () => {
  render(
    <TransitionRouter>
      <Snapshot />
    </TransitionRouter>,
  );
  act(() => history.pushState({ mode: 'view' }, '', '/trip/one/list'));
  act(() => history.back());
  await waitFor(() =>
    expect(screen.getByTestId('snapshot')).toHaveTextContent('/trip/one/home'),
  );
  act(() => history.forward());
  await waitFor(() =>
    expect(screen.getByTestId('snapshot')).toHaveTextContent('/trip/one/list'),
  );
});

it('retains the committed route while a destination suspends, and discards superseded navigation', async () => {
  // No ViewTransition boundaries here: this tests React scheduling, not a mock animation.
  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    value: vi.fn(),
  });
  let resolve!: (module: { default: () => ReactNode }) => void;
  const Slow = lazy(
    () =>
      new Promise<{ default: () => ReactNode }>((done) => {
        resolve = done;
      }),
  );
  render(
    <TransitionRouter>
      <Link to="/slow">Slow</Link>
      <Link to="/fast">Fast</Link>
      <Suspense fallback={<p>Fallback</p>}>
        <Snapshot />
        <Switch>
          <Route path="/slow" component={Slow} />
          <Route path="/fast">
            <p>Fast page</p>
          </Route>
          <Route>
            <p>Original page</p>
          </Route>
        </Switch>
      </Suspense>
    </TransitionRouter>,
  );
  fireEvent.click(screen.getByText('Slow'));
  expect(location.pathname).toBe('/slow');
  expect(screen.getByText('Original page')).toBeInTheDocument();
  expect(screen.getByTestId('snapshot')).toHaveTextContent('/trip/one/home');
  expect(screen.queryByText('Fallback')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Loading page');
  fireEvent.click(screen.getByText('Fast'));
  await screen.findByText('Fast page');
  await act(async () => resolve({ default: () => <p>Slow page</p> }));
  expect(location.pathname).toBe('/fast');
  expect(screen.queryByText('Slow page')).not.toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

describe('dialog navigation policy', () => {
  it.each([
    '/trip/a/list/activity/b',
    '/trip/a/timetable/accommodation/b',
    '/trip/a/list/macroplan/b',
    '/trip/a/tasks/task/b',
  ])('excludes %s', (path) => expect(isDialogRoute(path)).toBe(true));
  it.each([
    '/trip/a/list',
    '/trip/a/timetable',
    '/trip/a/tasks',
    '/trip/archived',
  ])('permits %s', (path) => expect(isDialogRoute(path)).toBe(false));
});

it.each(['dialog', 'reduced-motion', 'disabled', 'unsupported', 'explicit'])(
  'commits %s navigation urgently even when the next screen suspends',
  (mode) => {
    if (mode !== 'unsupported') {
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        value: vi.fn(),
      });
    }
    if (mode === 'reduced-motion') {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      );
    }
    const target = mode === 'dialog' ? '/trip/one/list/activity/a' : '/slow';
    const Slow = lazy(
      () => new Promise<{ default: () => ReactNode }>(() => {}),
    );
    render(
      <TransitionRouter transitions={mode !== 'disabled'}>
        <Snapshot />
        <Link to={target} transition={mode === 'explicit' ? false : undefined}>
          Navigate
        </Link>
        <Suspense fallback={<p>Fallback</p>}>
          <Switch>
            <Route path={target} component={Slow} />
            <Route>
              <p>Original</p>
            </Route>
          </Switch>
        </Suspense>
      </TransitionRouter>,
    );
    fireEvent.click(screen.getByText('Navigate'));
    expect(screen.getByTestId('snapshot')).toHaveTextContent(target);
    expect(screen.getByText('Fallback')).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  },
);
