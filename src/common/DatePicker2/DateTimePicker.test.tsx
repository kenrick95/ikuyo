import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { DateTimePicker } from './DateTimePicker';
import { DateTimePickerMode } from './DateTimePickerMode';

test('date trigger exposes its visible value as part of its accessible name', () => {
  render(
    <Theme>
      <DateTimePicker
        mode={DateTimePickerMode.Date}
        value={Temporal.PlainDate.from('2026-11-16')}
        aria-label="Payment date"
        onChange={vi.fn()}
      />
    </Theme>,
  );
  expect(
    screen.getByRole('button', { name: 'Payment date: 16 November 2026' }),
  ).toHaveTextContent('16 November 2026');
});

test('the shared calendar exposes cells under semantic rows', async () => {
  const user = userEvent.setup();
  render(
    <Theme>
      <DateTimePicker
        mode={DateTimePickerMode.Date}
        value={Temporal.PlainDate.from('2026-11-16')}
        onChange={vi.fn()}
      />
    </Theme>,
  );
  await user.click(
    screen.getByRole('button', { name: 'Select date: 16 November 2026' }),
  );
  const calendar = screen.getByRole('grid');
  expect(within(calendar).getAllByRole('row')).toHaveLength(8);
  expect(within(calendar).getAllByRole('columnheader')).toHaveLength(7);
  for (const cell of within(calendar).getAllByRole('gridcell'))
    expect(cell.parentElement?.closest('[role="row"]')).not.toBeNull();
  expect(
    screen.getByRole('gridcell', { name: 'November 16, 2026' }),
  ).toHaveAttribute('aria-selected', 'true');
});
