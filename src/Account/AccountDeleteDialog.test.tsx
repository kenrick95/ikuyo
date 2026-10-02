import { Theme } from '@radix-ui/themes';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { AccountDeleteDialog } from './AccountDeleteDialog';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  clearSession: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock('../data/apiClient', () => ({ mutate: mocks.mutate }));
vi.mock('../data/store', () => ({
  useBoundStore: (selector: (state: unknown) => unknown) =>
    selector({ clearSession: mocks.clearSession }),
}));
vi.mock('wouter', () => ({ useLocation: () => ['', mocks.navigate] }));

beforeEach(() => vi.resetAllMocks());

function openDialog() {
  render(
    <Theme>
      <AccountDeleteDialog />
    </Theme>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
}

test('requires explicit confirmation and clears cached data after deletion', async () => {
  mocks.mutate.mockResolvedValue({ ok: true });
  openDialog();
  const submit = screen.getByRole('button', { name: 'Delete my account' });
  expect(submit).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), {
    target: { value: 'DELETE' },
  });
  fireEvent.click(submit);
  await waitFor(() => expect(mocks.clearSession).toHaveBeenCalledOnce());
  expect(mocks.mutate).toHaveBeenCalledWith('/api/users/me', {
    method: 'DELETE',
    body: JSON.stringify({ confirmation: 'DELETE' }),
  });
  expect(mocks.navigate).toHaveBeenCalledOnce();
});

test('keeps the session and shows an error if deletion fails', async () => {
  mocks.mutate.mockRejectedValue(new Error('Please retry'));
  openDialog();
  fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), {
    target: { value: 'DELETE' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Please retry');
  expect(mocks.clearSession).not.toHaveBeenCalled();
  expect(mocks.navigate).not.toHaveBeenCalled();
  expect(
    screen.getByRole('button', { name: 'Delete my account' }),
  ).toBeEnabled();
});
