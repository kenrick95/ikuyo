import { DateTime } from 'luxon';
import type { TripSliceExpense } from '../Trip/store/types';

/**
 * Escapes CSV field values by wrapping in quotes and escaping internal quotes
 */
function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
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
  ];

  // Create CSV rows
  const rows = expenses.map((expense) => {
    const dateIncurred = DateTime.fromMillis(expense.timestampIncurred, {
      zone: expense.timeZoneIncurred || timeZone,
    }).toISODate();

    const createdAt = DateTime.fromMillis(expense.createdAt, {
      zone: expense.timeZoneIncurred || timeZone,
    }).toISO();

    const lastUpdatedAt = DateTime.fromMillis(expense.lastUpdatedAt, {
      zone: expense.timeZoneIncurred || timeZone,
    }).toISO();

    return [
      escapeCsvField(expense.title),
      escapeCsvField(expense.description),
      escapeCsvField(dateIncurred),
      escapeCsvField(expense.amount),
      escapeCsvField(expense.currency),
      escapeCsvField(expense.amountInOriginCurrency ?? ''),
      escapeCsvField(expense.currencyConversionFactor ?? ''),
      escapeCsvField(expense.timeZoneIncurred || timeZone),
      escapeCsvField(createdAt),
      escapeCsvField(lastUpdatedAt),
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
