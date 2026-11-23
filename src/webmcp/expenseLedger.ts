import { type ExpenseLedger, previewSplit, toMinor } from '../Expense/ledger';
import type { TripSliceTrip } from '../Trip/store/types';
import { asStr, str } from './schema';

export function expenseLedgerSchema(): Record<string, unknown> {
  return {
    type: 'object',
    description:
      'Optional payer and split. Defaults to paid by you, without splitting. Use participant IDs from trip-open.people; guests are supported. "me" means you.',
    additionalProperties: false,
    properties: {
      paidBy: {
        ...str('Participant ID, "me" (default), or "multiple".'),
        default: 'me',
      },
      method: {
        type: ['string', 'null'],
        enum: [null, 'equal', 'exact', 'percent', 'shares'],
        description:
          'Split method; null or omitted tracks the payer without splitting.',
      },
      shares: {
        type: 'array',
        maxItems: 100,
        description:
          'People sharing the expense. Required when a split method is set.',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            participantId: str('Trip participant ID or "me".'),
            value: str(
              'Decimal amount for exact, percentage for percent, or weight for shares. Omit for equal.',
            ),
          },
          required: ['participantId'],
        },
      },
      contributions: {
        type: 'array',
        minItems: 1,
        maxItems: 100,
        description:
          'Required for multiple payers. Nonnegative integer minor-unit amounts must add up to the total (SGD 3 = "300", JPY 3 = "3").',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            participantId: str('Trip participant ID or "me".'),
            amountMinor: {
              ...str('Integer minor units in this expense currency.'),
              pattern: '^[0-9]+$',
              maxLength: 13,
            },
          },
          required: ['participantId', 'amountMinor'],
        },
      },
    },
  };
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${field} must be an object.`);
  return value as Record<string, unknown>;
}

export function parseExpenseLedger(
  value: unknown,
  amount: number,
  currency: string,
  trip: TripSliceTrip,
): ExpenseLedger {
  const data = value === undefined ? {} : object(value, 'ledger');
  for (const key of Object.keys(data)) {
    if (!['paidBy', 'method', 'shares', 'contributions'].includes(key))
      throw new Error(`Unsupported ledger field: ${key}.`);
  }
  const participant = (value: unknown): string => {
    const id = asStr(value, 'participantId');
    if (id !== 'me' && !trip.people?.some((p) => p.id === id && !p.archived))
      throw new Error('Choose an active participant from this trip or "me".');
    return id;
  };
  const paidBy =
    data.paidBy === undefined ? 'me' : asStr(data.paidBy, 'ledger.paidBy');
  if (paidBy !== 'multiple') participant(paidBy);
  const method = data.method ?? null;
  if (
    method !== null &&
    !['equal', 'exact', 'percent', 'shares'].includes(String(method))
  )
    throw new Error('Choose a valid split method.');
  const rows = (value: unknown, field: string): Record<string, unknown>[] => {
    if (!Array.isArray(value) || !value.length || value.length > 100)
      throw new Error(`${field} must contain 1 to 100 people.`);
    const result = value.map((row) => object(row, field));
    const ids = result.map((row) => participant(row.participantId));
    if (new Set(ids).size !== ids.length)
      throw new Error('Choose each person only once.');
    return result;
  };
  const ledger: ExpenseLedger = {
    paidBy,
    method: method as ExpenseLedger['method'],
    shares:
      method === null
        ? []
        : rows(data.shares, 'ledger.shares').map((row) => ({
            participantId: participant(row.participantId),
            ...(method === 'equal'
              ? {}
              : { value: asStr(row.value, 'share value') }),
          })),
  };
  previewSplit(String(amount), currency, ledger);
  if (paidBy === 'multiple') {
    ledger.contributions = rows(data.contributions, 'ledger.contributions').map(
      (row) => {
        const amountMinor = asStr(row.amountMinor, 'amountMinor');
        if (
          !/^\d{1,13}$/.test(amountMinor) ||
          BigInt(amountMinor) > 1_000_000_000_000n
        )
          throw new Error('Enter valid payer amounts in minor units.');
        return { participantId: participant(row.participantId), amountMinor };
      },
    );
    if (
      ledger.contributions.reduce(
        (sum, row) => sum + BigInt(row.amountMinor),
        0n,
      ) !== BigInt(toMinor(String(amount), currency))
    )
      throw new Error('Payer amounts must match the expense total.');
  }
  return ledger;
}
