import { describe, expect, test } from 'vitest';
import fixtures from '../../shared/expense-split-fixtures.json';
import { expenseTotals } from './ExpenseHeaderCard';
import { formatMinor, previewSplit, type SplitMethod, toMinor } from './ledger';

describe('expense ledger arithmetic', () => {
  for (const fixture of fixtures) {
    test(`${fixture.currency} ${fixture.method} matches the server fixture`, () => {
      const result = previewSplit(fixture.amount, fixture.currency, {
        paidBy: 'a',
        method: fixture.method as SplitMethod,
        shares: fixture.shares,
      });
      expect(
        Object.fromEntries(
          result.map((row) => [row.participantId, row.amountMinor]),
        ),
      ).toEqual(fixture.expected);
    });
  }
  test('preserves every minor unit and deterministic ties across input order', () => {
    for (let n = 1; n < 50; n++) {
      const shares = ['a', 'b', 'c'].map((participantId) => ({
        participantId,
      }));
      const ledger = { paidBy: 'a', method: 'equal' as const, shares };
      const result = previewSplit(`${n / 100}`, 'SGD', ledger);
      expect(
        result.reduce((sum, row) => sum + BigInt(row.amountMinor), 0n),
      ).toBe(BigInt(n));
      expect(
        previewSplit(`${n / 100}`, 'SGD', {
          ...ledger,
          shares: [...shares].reverse(),
        }),
      ).toEqual(result);
    }
  });
  test('rejects excess currency precision, overflow and invalid allocations', () => {
    expect(() => toMinor('1.01', 'JPY')).toThrow('decimal');
    expect(() => toMinor('1000000000000', 'SGD')).toThrow('range');
    expect(() => toMinor('1e3', 'SGD')).toThrow('amount');
    expect(() =>
      previewSplit('10', 'SGD', {
        paidBy: 'a',
        method: 'percent',
        shares: [{ participantId: 'a', value: '99' }],
      }),
    ).toThrow('100%');
    expect(() =>
      previewSplit('10', 'SGD', {
        paidBy: 'a',
        method: 'exact',
        shares: [{ participantId: 'a', value: '9' }],
      }),
    ).toThrow('left to assign');
    expect(formatMinor('-1', 'SGD')).toBe('SGD -0.01');
  });
  test('never adds unconverted USD to an SGD total and preserves zero conversions', () => {
    const totals = expenseTotals(
      [
        { currency: 'SGD', amount: 10 },
        { currency: 'USD', amount: 20 },
        { currency: 'JPY', amount: 30, amountInOriginCurrency: 0 },
      ],
      'SGD',
    );
    expect(totals).toEqual({
      totals: { SGD: 10, USD: 20, JPY: 30 },
      converted: 10,
      missing: 1,
    });
  });
});

test('refunds reduce spending without changing stored positive expense amounts', () => {
  expect(
    expenseTotals(
      [
        { currency: 'SGD', amount: 90 },
        { currency: 'SGD', amount: 30, ledger: { kind: 'refund' } },
      ],
      'SGD',
    ),
  ).toEqual({ totals: { SGD: 60 }, converted: 60, missing: 0 });
});
