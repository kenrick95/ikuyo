import exponents from '../../shared/currency-minor-units.json';

export type SplitMethod = 'equal' | 'exact' | 'percent' | 'shares';
export type ExpenseLedger = {
  kind?: 'expense' | 'refund';
  refundOf?: string | null;
  paidBy: string;
  method: SplitMethod | null;
  shares: { participantId: string; value?: string }[];
  contributions?: { participantId: string; amountMinor: string }[];
  allocations?: { participantId: string; amountMinor: string }[];
};
export type Settlement = {
  id: string;
  senderId: string;
  recipientId: string;
  currency: string;
  amountMinor: string;
  paidCurrency?: string;
  paidAmountMinor?: string;
  date: string;
  note: string;
  voided: boolean;
};
export type ExpenseLedgerData = {
  currencies: {
    currency: string;
    balances: { participantId: string; amountMinor: string }[];
    suggestions: {
      senderId: string;
      recipientId: string;
      amountMinor: string;
    }[];
  }[];
  payments: Settlement[];
  splitCount: number;
  expenseCount: number;
};

export function currencyExponent(currency: string): number {
  const digits = (exponents as Record<string, number>)[currency];
  if (digits === undefined) throw new Error('Unsupported settlement currency.');
  return digits;
}

export function scaled(
  value: string,
  digits: number,
  max = 1_000_000_000_000n,
): bigint {
  if (!/^\d+(?:\.\d+)?$/.test(value)) throw new Error('Enter a valid amount.');
  const [whole, raw = ''] = value.split('.');
  const fraction = raw.replace(/0+$/, '');
  if (fraction.length > digits) throw new Error('Too many decimal places.');
  const result = BigInt(whole + fraction.padEnd(digits, '0'));
  if (result > max) throw new Error('Amount exceeds the supported range.');
  return result;
}
export function toMinor(value: string, currency: string): string {
  return scaled(value, currencyExponent(currency)).toString();
}
export function minorToDecimal(value: string, currency: string): string {
  const n = BigInt(value),
    negative = n < 0n,
    absolute = negative ? -n : n;
  const digits = currencyExponent(currency),
    base = 10n ** BigInt(digits);
  return `${negative ? '-' : ''}${absolute / base}${digits ? `.${(absolute % base).toString().padStart(digits, '0')}` : ''}`;
}
export function formatMinor(value: string, currency: string): string {
  const [whole, fraction] = minorToDecimal(value, currency).split('.');
  const formatted = BigInt(whole).toLocaleString('en-SG');
  return `${currency} ${value.startsWith('-') && BigInt(whole) === 0n ? '-' : ''}${formatted}${fraction ? `.${fraction}` : ''}`;
}
export function previewSplit(
  amount: string,
  currency: string,
  ledger: Pick<ExpenseLedger, 'method' | 'shares'>,
) {
  const total = BigInt(toMinor(amount, currency));
  if (total <= 0n) throw new Error('Amount must be greater than zero.');
  if (!ledger.method) return [];
  if (!ledger.shares.length) throw new Error('Choose at least one person.');
  const entries = [...ledger.shares].sort((a, b) =>
    a.participantId.localeCompare(b.participantId),
  );
  const weights = entries.map((row) =>
    ledger.method === 'equal'
      ? 1n
      : ledger.method === 'exact'
        ? BigInt(toMinor(row.value || '0', currency))
        : scaled(row.value || '0', 4, 1_000_000n),
  );
  const sum = weights.reduce((a, b) => a + b, 0n);
  if (ledger.method === 'exact') {
    if (sum !== total)
      throw new Error(
        `${formatMinor((sum < total ? total - sum : sum - total).toString(), currency)} ${sum < total ? 'left to assign' : 'over the total'}.`,
      );
    return entries.map((row, i) => ({
      participantId: row.participantId,
      amountMinor: weights[i].toString(),
    }));
  }
  if (ledger.method === 'percent' && sum !== 1_000_000n)
    throw new Error('Percentages must total 100%.');
  if (sum === 0n) throw new Error('Enter at least one positive share.');
  const rows = entries.map((row, i) => ({
    participantId: row.participantId,
    n: (total * weights[i]) / sum,
    remainder: (total * weights[i]) % sum,
  }));
  let remaining = total - rows.reduce((n, row) => n + row.n, 0n);
  [...rows]
    .sort((a, b) =>
      a.remainder === b.remainder
        ? a.participantId.localeCompare(b.participantId)
        : a.remainder > b.remainder
          ? -1
          : 1,
    )
    .forEach((row) => {
      if (remaining > 0n) {
        row.n++;
        remaining--;
      }
    });
  return rows.map((row) => ({
    participantId: row.participantId,
    amountMinor: row.n.toString(),
  }));
}
