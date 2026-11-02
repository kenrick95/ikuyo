import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { BackendLogin } from './BackendLogin';

const mocks = vi.hoisted(() => ({
  registrationEnabled: false,
  mutate: vi.fn(),
  postMutation: vi.fn(),
  publishToast: vi.fn(),
  subscribeUser: vi.fn(),
  setLocation: vi.fn(),
}));
vi.mock('../data/store', () => ({
  useBoundStore: (selector: (state: typeof mocks) => unknown) =>
    selector(mocks),
}));
vi.mock('../data/apiClient', () => ({
  ApiError: class extends Error {},
  mutate: mocks.mutate,
  postMutation: mocks.postMutation,
}));
vi.mock('../data/backendConfig', () => ({ assertWritable: vi.fn() }));
vi.mock('wouter', () => ({ useLocation: () => ['/login', mocks.setLocation] }));
vi.mock('./GoogleLogin', () => ({ GoogleLogin: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.registrationEnabled = false;
  window.history.replaceState(null, '', '/login');
});

async function enterEmail() {
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'person@example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await waitFor(() => expect(mocks.mutate).toHaveBeenCalled());
}

test('closed signup hides guest entry and does not offer signup for unknown emails', async () => {
  mocks.mutate.mockResolvedValue({ known: false, needsPasswordSetup: true });
  render(<BackendLogin />);
  expect(screen.getByRole('status')).toHaveTextContent(
    'New signups are currently disabled',
  );
  expect(
    screen.queryByRole('button', { name: 'Try as guest' }),
  ).not.toBeInTheDocument();
  await enterEmail();
  await waitFor(() => expect(mocks.publishToast).toHaveBeenCalled());
  expect(
    screen.queryByRole('button', { name: 'Create account' }),
  ).not.toBeInTheDocument();
  expect(mocks.postMutation).not.toHaveBeenCalled();
});

test('closed signup still lets existing accounts reach password login', async () => {
  mocks.mutate.mockResolvedValue({ known: true, needsPasswordSetup: false });
  render(<BackendLogin />);
  await enterEmail();
  expect(
    await screen.findByRole('button', { name: 'Log in' }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Try as guest' }),
  ).not.toBeInTheDocument();
});

test('open signup keeps guest entry and unknown-email signup available', async () => {
  mocks.registrationEnabled = true;
  mocks.mutate.mockResolvedValue({ known: false, needsPasswordSetup: true });
  render(<BackendLogin />);
  expect(
    screen.getByRole('button', { name: 'Try as guest' }),
  ).toBeInTheDocument();
  await enterEmail();
  expect(
    await screen.findByRole('button', { name: 'Create account' }),
  ).toBeInTheDocument();
});
