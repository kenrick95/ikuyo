import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { GoogleLogin } from './GoogleLogin';

const { get, mutate, assertWritable } = vi.hoisted(() => ({
  get: vi.fn(),
  mutate: vi.fn(),
  assertWritable: vi.fn(),
}));
vi.mock('../data/apiClient', () => ({ get, mutate }));
vi.mock('../data/backendConfig', () => ({ assertWritable }));

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/login');
  get.mockResolvedValue({ enabled: true });
});

test('hides Google login when the backend has no credentials', async () => {
  get.mockResolvedValue({ enabled: false });
  render(<GoogleLogin />);
  await waitFor(() => expect(get).toHaveBeenCalled());
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('starts login through the CSRF-protected mutation and displays failures', async () => {
  mutate.mockRejectedValue(new Error('Google is unavailable'));
  render(<GoogleLogin />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Continue with Google' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Google is unavailable',
  );
  expect(mutate).toHaveBeenCalledWith('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ upgrade: false }),
  });
  expect(assertWritable).not.toHaveBeenCalled();
});

test('guest upgrade uses an explicit intent and respects the read-only flag', async () => {
  assertWritable.mockImplementationOnce(() => {
    throw new Error('Read-only mode');
  });
  render(<GoogleLogin upgrade />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Link Google account' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent('Read-only mode');
  expect(mutate).not.toHaveBeenCalled();
  mutate.mockRejectedValue(new Error('Try later'));
  fireEvent.click(screen.getByRole('button', { name: 'Link Google account' }));
  await waitFor(() =>
    expect(mutate).toHaveBeenCalledWith('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ upgrade: true }),
    }),
  );
});

test('explains a callback conflict while retaining the guest account', () => {
  window.history.replaceState(
    null,
    '',
    '/account/upgrade?google_error=conflict',
  );
  render(<GoogleLogin upgrade />);
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Your guest account and trips have been kept',
  );
});
