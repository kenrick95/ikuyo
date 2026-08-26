import { assertWritable } from '../data/backendConfig';
import { useBoundStore } from '../data/store';
import { dbAddExpense, dbDeleteExpense, dbUpdateExpense } from '../Expense/db';
import { requireAuthUser, requireLoadedTrip, resolveTripId } from './context';
import type { WebMCPTool } from './modelContext';
import { asOptNum, asOptStr, asStr, num, str, toEpochMs } from './schema';

export function createExpenseTools(): WebMCPTool[] {
  return [
    {
      name: 'expense-create',
      description:
        'Records an expense in a trip. Requires a title and amount; currency defaults to the trip currency.',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id. Defaults to the currently open trip.'),
          title: str('Expense title.'),
          amount: num('Amount spent (numeric).'),
          currency: str('ISO 4217 currency code (e.g. JPY).'),
          description: str('Optional description.'),
          timestampIncurred: str(
            'Optional date incurred (ISO-8601 or epoch ms).',
          ),
        },
        required: ['title', 'amount'],
      },
      async execute(input) {
        assertWritable('creating an expense');
        requireAuthUser();
        const tripId = resolveTripId(input.tripId);
        requireLoadedTrip(tripId);
        const trip = useBoundStore.getState().trip[tripId];
        const amount = asOptNum(input.amount, 'amount');
        if (amount === undefined || amount === null)
          throw new Error('amount is required and must be a number');
        const currency =
          (input.currency as string | undefined)?.toUpperCase() ??
          trip.currency;
        const result = await dbAddExpense(
          {
            title: asStr(input.title, 'title'),
            description: asOptStr(input.description, 'description') ?? '',
            timestampIncurred:
              toEpochMs(input.timestampIncurred, 'timestampIncurred') ??
              Date.now(),
            currency,
            amount,
            currencyConversionFactor: undefined,
            amountInOriginCurrency: undefined,
            timeZoneIncurred:
              asOptStr(input.timeZoneIncurred, 'timeZoneIncurred') ?? null,
          },
          { tripId },
        );
        return { ok: true, id: result.id, expenseId: result.id };
      },
    },
    {
      name: 'expense-get',
      description: 'Returns an expense from the locally loaded state by id.',
      inputSchema: {
        type: 'object',
        properties: {
          expenseId: str('The expense id.'),
        },
        required: ['expenseId'],
      },
      annotations: { readOnlyHint: true },
      execute(input) {
        requireAuthUser();
        const id = asStr(input.expenseId, 'expenseId');
        const e = useBoundStore.getState().expense[id];
        if (!e) throw new Error(`Expense ${id} is not loaded.`);
        return { ok: true, expense: e };
      },
    },
    {
      name: 'expense-update',
      description:
        'Updates an existing expense (amount, title, description, date, currency). Only provided fields are changed.',
      inputSchema: {
        type: 'object',
        properties: {
          expenseId: str('The expense id.'),
          title: str('New title.'),
          amount: num('New amount.'),
          currency: str('New ISO 4217 currency.'),
          description: str('New description.'),
          timestampIncurred: str('New incurred date (ISO-8601 or epoch ms).'),
        },
        required: ['expenseId'],
      },
      async execute(input) {
        assertWritable('updating an expense');
        requireAuthUser();
        const id = asStr(input.expenseId, 'expenseId');
        const existing = useBoundStore.getState().expense[id];
        if (!existing) throw new Error(`Expense ${id} is not loaded.`);
        const amount = asOptNum(input.amount, 'amount') ?? existing.amount;
        await dbUpdateExpense({
          id,
          title: (input.title as string | undefined) ?? existing.title,
          description:
            asOptStr(input.description, 'description') ?? existing.description,
          timestampIncurred:
            toEpochMs(input.timestampIncurred, 'timestampIncurred') ??
            existing.timestampIncurred,
          currency:
            (input.currency as string | undefined)?.toUpperCase() ??
            existing.currency,
          amount,
          currencyConversionFactor: existing.currencyConversionFactor,
          amountInOriginCurrency: existing.amountInOriginCurrency,
          timeZoneIncurred:
            asOptStr(input.timeZoneIncurred, 'timeZoneIncurred') ??
            existing.timeZoneIncurred,
        });
        return { ok: true, expenseId: id };
      },
    },
    {
      name: 'expense-delete',
      description:
        'HIGH-RISK: permanently deletes an expense and its comments. Destructive and irreversible.',
      inputSchema: {
        type: 'object',
        properties: {
          expenseId: str('The expense id to delete.'),
        },
        required: ['expenseId'],
      },
      async execute(input) {
        assertWritable('deleting an expense');
        requireAuthUser();
        const id = asStr(input.expenseId, 'expenseId');
        await dbDeleteExpense(id);
        return { ok: true, deletedExpenseId: id };
      },
    },
  ];
}
