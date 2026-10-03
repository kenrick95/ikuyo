import { Theme } from '@radix-ui/themes';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { deleteMutation, postMutation } from '../data/apiClient';
import { RecordActions } from './components';

vi.mock('../data/apiClient', () => ({
  postMutation: vi.fn(),
  deleteMutation: vi.fn(),
}));

function actions(disabled: boolean, onChanged = vi.fn(), deleted = false) {
  return (
    <Theme>
      <RecordActions
        path="/api/admin/users/owner"
        label="Traveler"
        deleted={deleted}
        disabled={disabled}
        onChanged={onChanged}
      />
    </Theme>
  );
}

async function openMenu() {
  const trigger = screen.getByRole('button', { name: 'Actions for Traveler' });
  fireEvent.keyDown(trigger, { key: 'Enter' });
  return screen.findByRole('menuitem', { name: 'Delete' });
}

test('disables an already-open action when the parent starts refreshing', async () => {
  vi.mocked(deleteMutation).mockClear();
  const { rerender } = render(actions(false));
  await openMenu();
  rerender(actions(true));
  const item = screen.getByRole('menuitem', { name: 'Delete' });
  expect(item).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(item);
  expect(deleteMutation).not.toHaveBeenCalled();
});

test('does not refresh the old page when a mutation finishes after navigation', async () => {
  let finish!: (value: unknown) => void;
  vi.mocked(postMutation).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const onChanged = vi.fn();
  const { unmount } = render(actions(false, onChanged, true));
  fireEvent.click(screen.getByRole('button', { name: 'Restore Traveler' }));
  expect(postMutation).toHaveBeenCalledWith(
    '/api/admin/users/owner/restore',
    {},
  );
  unmount();
  await act(async () => finish({ ok: true }));
  expect(onChanged).not.toHaveBeenCalled();
});
