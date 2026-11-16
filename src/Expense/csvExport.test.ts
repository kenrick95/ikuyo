import { expect, test } from 'vitest';
import type { TripSliceExpense } from '../Trip/store/types';
import { expensesToCsv, ledgerStatementToCsv } from './csvExport';
import type { ExpenseLedgerData } from './ledger';

test('refund and origin amounts remain numeric in expense CSV', () => {
  const csv = expensesToCsv(
    [
      {
        id: 'refund',
        tripId: 'trip',
        commentGroupId: undefined,
        currencyConversionFactor: 1.5,
        timeZoneIncurred: 'UTC',
        title: '=1+2',
        description: '-1+2',
        amount: 30,
        amountInOriginCurrency: 20,
        currency: 'SGD',
        timestampIncurred: 1,
        createdAt: 1,
        lastUpdatedAt: 1,
        ledger: { kind: 'refund', paidBy: 'a', method: null, shares: [] },
      } as TripSliceExpense,
    ],
    'UTC',
  );
  const row = csv.split('\n')[1].split(',');
  expect(row[0]).toBe("'=1+2");
  expect(row[1]).toBe("'-1+2");
  expect(row[3]).toBe('-30');
  expect(row[5]).toBe('-20');
});

test('negative balances remain numeric while spreadsheet formulas in names and notes are escaped', () => {
  const data: ExpenseLedgerData = {
    participants: [
      { id: 'a', name: '@SUM(A1)', userId: null, handle: null, guest: true },
    ],
    currencies: [
      {
        currency: 'SGD',
        balances: [{ participantId: 'a', amountMinor: '-3000' }],
        suggestions: [],
      },
    ],
    payments: [
      {
        id: 'p',
        senderId: 'a',
        recipientId: 'b',
        currency: 'SGD',
        amountMinor: '1000',
        date: '2026-11-16',
        note: '+1+2',
        voided: false,
      },
    ],
    splitCount: 1,
    expenseCount: 1,
  };
  const rows = ledgerStatementToCsv(data)
    .split('\n')
    .map((row) => row.split(','));
  expect(rows[1][6]).toBe('-30.00');
  expect(rows[1][2]).toBe("'@SUM(A1)");
  expect(rows[2][8]).toBe("'+1+2");
});
