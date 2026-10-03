import { Theme } from '@radix-ui/themes';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { postMutation } from '../data/apiClient';
import { RecordActions } from './components';

vi.mock('../data/apiClient', () => ({
  postMutation: vi.fn(),
  deleteMutation: vi.fn(),
}));

function actions(disabled: boolean, onChanged = vi.fn()) {
  return (
    <Theme>
      <RecordActions
        path="/api/admin/users/owner"
        label="Traveler"
        deleted
        disabled={disabled}
        onChanged={onChanged}
      />
    </Theme>
  );
}

async function openMenu() {
  const trigger = screen.getByRole('button', { name: 'Actions for Traveler' });
  fireEvent.keyDown(trigger, { key: 'Enter' });
  return screen.findByRole('menuitem', { name: 'Restore' });
}

test('disables an already-open action when the parent starts refreshing', async () => {
  vi.mocked(postMutation).mockClear();
  const { rerender } = render(actions(false));
  await openMenu();
  rerender(actions(true));
  const item = screen.getByRole('menuitem', { name: 'Restore' });
  expect(item).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(item);
  expect(postMutation).not.toHaveBeenCalled();
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
  const { unmount } = render(actions(false, onChanged));
  fireEvent.click(await openMenu());
  expect(postMutation).toHaveBeenCalledWith(
    '/api/admin/users/owner/restore',
    {},
  );
  unmount();
  await act(async () => finish({ ok: true }));
  expect(onChanged).not.toHaveBeenCalled();
});
