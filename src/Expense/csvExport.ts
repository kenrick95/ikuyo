import { toFormat } from '../common/dateTime/temporalFormatter';
import type { TripSliceExpense } from '../Trip/store/types';
import { minorToDecimal } from './ledger';

/**
 * Escapes CSV field values by wrapping in quotes and escaping internal quotes
 */
function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const original = String(value);
  const stringValue = /^\s*[=+\-@]|^[\t\r]/.test(original)
    ? `'${original}`
    : original;
  // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Converts expenses to CSV format
 */
export function expensesToCsv(
  expenses: TripSliceExpense[],
  timeZone: string,
  participants: import('./ledger').ExpenseParticipant[] = [],
): string {
  // Define CSV headers
  const headers = [
    'Title',
    'Description',
    'Date',
    'Amount',
    'Currency',
    'Amount in Origin Currency',
    'Currency Conversion Factor',
    'Time Zone',
    'Created At',
    'Last Updated At',
    'Paid by (participant IDs)',
    'Split method',
    'Allocations (minor units)',
    'Entry kind',
    'Refund of',
    'Payers',
    'Shares',
  ];

  // Create CSV rows
  const rows = expenses.map((expense) => {
    const dateIncurred = toFormat(
      'YYYY-MM-DD',
      Temporal.Instant.fromEpochMilliseconds(
        expense.timestampIncurred,
      ).toZonedDateTimeISO(expense.timeZoneIncurred ?? timeZone),
    );
    const createdAt = toFormat(
      'YYYY-MM-DDTHH:mm:ssZ',
      Temporal.Instant.fromEpochMilliseconds(
        expense.createdAt,
      ).toZonedDateTimeISO(expense.timeZoneIncurred ?? timeZone),
    );
    const lastUpdatedAt = toFormat(
      'YYYY-MM-DDTHH:mm:ssZ',
      Temporal.Instant.fromEpochMilliseconds(
        expense.lastUpdatedAt,
      ).toZonedDateTimeISO(expense.timeZoneIncurred ?? timeZone),
    );

    return [
      escapeCsvField(expense.title),
      escapeCsvField(expense.description),
      escapeCsvField(dateIncurred),
      escapeCsvField(
        expense.ledger?.kind === 'refund' ? -expense.amount : expense.amount,
      ),
      escapeCsvField(expense.currency),
      escapeCsvField(
        expense.amountInOriginCurrency == null
          ? ''
          : expense.ledger?.kind === 'refund'
            ? -expense.amountInOriginCurrency
            : expense.amountInOriginCurrency,
      ),
      escapeCsvField(expense.currencyConversionFactor ?? ''),
      escapeCsvField(expense.timeZoneIncurred || timeZone),
      escapeCsvField(createdAt),
      escapeCsvField(lastUpdatedAt),
      escapeCsvField(
        expense.ledger?.contributions
          ?.map((row) => `${row.participantId}:${row.amountMinor}`)
          .join('; '),
      ),
      escapeCsvField(expense.ledger?.method),
      escapeCsvField(
        expense.ledger?.allocations
          ?.map((row) => `${row.participantId}:${row.amountMinor}`)
          .join('; '),
      ),
      escapeCsvField(expense.ledger?.kind ?? 'expense'),
      escapeCsvField(expense.ledger?.refundOf),
      escapeCsvField(
        expense.ledger?.contributions
          ?.map(
            (row) =>
              `${participants.find((p) => p.id === row.participantId)?.name ?? row.participantId}: ${minorToDecimal(row.amountMinor, expense.currency)}`,
          )
          .join('; '),
      ),
      escapeCsvField(
        expense.ledger?.allocations
          ?.map(
            (row) =>
              `${participants.find((p) => p.id === row.participantId)?.name ?? row.participantId}: ${minorToDecimal(row.amountMinor, expense.currency)}`,
          )
          .join('; '),
      ),
    ].join(',');
  });

  // Combine headers and rows
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Triggers download of CSV file
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/** Balances and recorded payments retain separate native currency amounts. */
export function ledgerStatementToCsv(
  ledger: import('./ledger').ExpenseLedgerData,
): string {
  const name = (id: string) =>
    ledger.participants.find((p) => p.id === id)?.name ?? '';
  const rows: (string | number)[][] = [
    [
      'Type',
      'Currency',
      'Person',
      'Participant ID',
      'Paid to',
      'Recipient ID',
      'Amount',
      'Date',
      'Note',
      'Status',
      'Payment currency',
      'Amount paid',
    ],
  ];
  for (const group of ledger.currencies) {
    for (const balance of group.balances) {
      rows.push([
        'Balance',
        group.currency,
        name(balance.participantId),
        balance.participantId,
        '',
        '',
        minorToDecimal(balance.amountMinor, group.currency),
        '',
        '',
        BigInt(balance.amountMinor) > 0n
          ? 'Owed'
          : BigInt(balance.amountMinor) < 0n
            ? 'Owes'
            : 'Settled',
        '',
        '',
      ]);
    }
  }
  for (const payment of ledger.payments)
    rows.push([
      'Payment',
      payment.currency,
      name(payment.senderId),
      payment.senderId,
      name(payment.recipientId),
      payment.recipientId,
      minorToDecimal(payment.amountMinor, payment.currency),
      payment.date,
      payment.note,
      payment.voided ? 'Voided' : 'Recorded',
      payment.paidCurrency ?? payment.currency,
      minorToDecimal(
        payment.paidAmountMinor ?? payment.amountMinor,
        payment.paidCurrency ?? payment.currency,
      ),
    ]);
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\n');
}
