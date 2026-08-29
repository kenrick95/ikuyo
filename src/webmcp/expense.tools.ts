import { assertWritable } from '../data/backendConfig';
import { useBoundStore } from '../data/store';
import { dbAddExpense, dbDeleteExpense, dbUpdateExpense } from '../Expense/db';
import { requireAuthUser, requireLoadedTrip, resolveTripId } from './context';
import {
  deletionConfirmationSchema,
  requireDeletionConfirmation,
} from './destructive';
import { idempotencyKeySchema, runIdempotent } from './idempotency';
import type { WebMCPTool } from './modelContext';
import {
  asOptNum,
  asOptStr,
  asStr,
  epochOrIso,
  num,
  str,
  toEpochMs,
} from './schema';

export function resolveExpenseConversion({
  amount,
  currency,
  originCurrency,
  currencyConversionFactor,
  amountInOriginCurrency,
}: {
  amount: number;
  currency: string;
  originCurrency: string | undefined;
  currencyConversionFactor: number | null | undefined;
  amountInOriginCurrency: number | null | undefined;
}) {
  currencyConversionFactor ??= undefined;
  amountInOriginCurrency ??= undefined;
  if (
    (currencyConversionFactor === undefined) !==
    (amountInOriginCurrency === undefined)
  ) {
    throw new Error(
      'currencyConversionFactor and amountInOriginCurrency must be provided together.',
    );
  }
  if (
    currencyConversionFactor !== undefined &&
    amountInOriginCurrency !== undefined
  ) {
    if (currencyConversionFactor <= 0 || amountInOriginCurrency <= 0) {
      throw new Error('Expense conversion values must be greater than zero.');
    }
    return { currencyConversionFactor, amountInOriginCurrency };
  }
  if (currency === originCurrency?.toUpperCase()) {
    return { currencyConversionFactor: 1, amountInOriginCurrency: amount };
  }
  return {
    currencyConversionFactor: undefined,
    amountInOriginCurrency: undefined,
  };
}

export function createExpenseTools(): WebMCPTool[] {
  return [
    {
      name: 'expense-create',
      description:
        'Records an expense in a trip. Requires a title and amount; currency defaults to the trip currency. When the expense currency differs from the trip origin currency and no conversion is supplied, first look up the exchange rate online for the incurred date, then provide both conversion values. currencyConversionFactor is expense-currency units per 1 origin-currency unit; amountInOriginCurrency equals amount divided by that factor. Conversion is automatically 1:1 when the currencies match. If a reliable rate cannot be found, conversion may be omitted.',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id. Defaults to the currently open trip.'),
          idempotencyKey: idempotencyKeySchema(),
          title: str('Expense title.'),
          amount: num('Amount spent (numeric).'),
          currency: str('ISO 4217 currency code (e.g. JPY).'),
          currencyConversionFactor: num(
            'Optional conversion factor from origin currency to expense currency. Provide together with amountInOriginCurrency.',
          ),
          amountInOriginCurrency: num(
            'Optional amount in the trip origin currency. Provide together with currencyConversionFactor.',
          ),
          description: str('Optional description.'),
          timestampIncurred: epochOrIso(
            'Optional date incurred (ISO-8601 or epoch ms).',
          ),
          timeZoneIncurred: str(
            'Optional IANA time zone where it was incurred.',
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
        const conversion = resolveExpenseConversion({
          amount,
          currency,
          originCurrency: trip.originCurrency,
          currencyConversionFactor: asOptNum(
            input.currencyConversionFactor,
            'currencyConversionFactor',
          ),
          amountInOriginCurrency: asOptNum(
            input.amountInOriginCurrency,
            'amountInOriginCurrency',
          ),
        });
        const data = {
          title: asStr(input.title, 'title'),
          description: asOptStr(input.description, 'description') ?? '',
          timestampIncurred:
            toEpochMs(input.timestampIncurred, 'timestampIncurred') ??
            Date.now(),
          currency,
          amount,
          ...conversion,
          timeZoneIncurred:
            asOptStr(input.timeZoneIncurred, 'timeZoneIncurred') ?? null,
        };
        return runIdempotent(
          'expense-create',
          tripId,
          input.idempotencyKey,
          input,
          async () => {
            const result = await dbAddExpense(data, { tripId });
            return { ok: true, id: result.id, expenseId: result.id };
          },
        );
      },
    },
    {
      name: 'expense-create-many',
      description:
        'Creates up to 50 expenses in one trip, for example when importing receipts or a day of cash spending. Every item is validated before the first write. Writes are ordered and non-atomic; per-item idempotency keys make retrying safe.',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id applied to expenses that omit tripId.'),
          expenses: {
            type: 'array',
            minItems: 1,
            maxItems: 50,
            description: 'Ordered expenses to create.',
            items: {
              type: 'object',
              properties: {
                idempotencyKey: idempotencyKeySchema(),
                title: str('Expense title.'),
                amount: num('Amount spent (numeric).'),
                currency: str('ISO 4217 currency code (e.g. JPY).'),
                currencyConversionFactor: num(
                  'Optional conversion factor from origin currency to expense currency. Provide together with amountInOriginCurrency.',
                ),
                amountInOriginCurrency: num(
                  'Optional amount in the trip origin currency. Provide together with currencyConversionFactor.',
                ),
                description: str('Optional description.'),
                timestampIncurred: epochOrIso(
                  'Optional date incurred (ISO-8601 or epoch ms).',
                ),
                timeZoneIncurred: str(
                  'Optional IANA time zone where it was incurred.',
                ),
              },
              required: ['title', 'amount'],
            },
          },
        },
        required: ['expenses'],
      },
      async execute(input) {
        assertWritable('creating expenses');
        requireAuthUser();
        if (
          !Array.isArray(input.expenses) ||
          input.expenses.length < 1 ||
          input.expenses.length > 50
        ) {
          throw new Error('expenses must contain between 1 and 50 items');
        }
        const tripId = resolveTripId(input.tripId);
        requireLoadedTrip(tripId);
        const trip = useBoundStore.getState().trip[tripId];
        const items = input.expenses.map((item, index) => {
          if (!item || typeof item !== 'object')
            throw new Error(`expenses[${index}] must be an object`);
          const merged: Record<string, unknown> = {
            tripId,
            ...(item as Record<string, unknown>),
          };
          const amount = asOptNum(merged.amount, 'amount');
          if (amount === undefined || amount === null)
            throw new Error('amount is required and must be a number');
          const currency =
            (merged.currency as string | undefined)?.toUpperCase() ??
            trip.currency;
          resolveExpenseConversion({
            amount,
            currency,
            originCurrency: trip.originCurrency,
            currencyConversionFactor: asOptNum(
              merged.currencyConversionFactor,
              'currencyConversionFactor',
            ),
            amountInOriginCurrency: asOptNum(
              merged.amountInOriginCurrency,
              'amountInOriginCurrency',
            ),
          });
          asStr(merged.title, 'title');
          toEpochMs(merged.timestampIncurred, 'timestampIncurred');
          return merged;
        });
        const results: Array<Record<string, unknown>> = [];
        for (let index = 0; index < items.length; index++) {
          try {
            const item = items[index];
            const amount = asOptNum(item.amount, 'amount');
            if (amount === undefined || amount === null) {
              throw new Error('amount is required and must be a number');
            }
            const currency =
              (item.currency as string | undefined)?.toUpperCase() ??
              trip.currency;
            const conversion = resolveExpenseConversion({
              amount,
              currency,
              originCurrency: trip.originCurrency,
              currencyConversionFactor: asOptNum(
                item.currencyConversionFactor,
                'currencyConversionFactor',
              ),
              amountInOriginCurrency: asOptNum(
                item.amountInOriginCurrency,
                'amountInOriginCurrency',
              ),
            });
            results.push(
              await runIdempotent(
                'expense-create',
                tripId,
                item.idempotencyKey,
                item,
                async () => {
                  const result = await dbAddExpense(
                    {
                      title: asStr(item.title, 'title'),
                      description:
                        asOptStr(item.description, 'description') ?? '',
                      timestampIncurred:
                        toEpochMs(
                          item.timestampIncurred,
                          'timestampIncurred',
                        ) ?? Date.now(),
                      currency,
                      amount,
                      ...conversion,
                      timeZoneIncurred:
                        asOptStr(item.timeZoneIncurred, 'timeZoneIncurred') ??
                        null,
                    },
                    { tripId },
                  );
                  return { ok: true, id: result.id, expenseId: result.id };
                },
              ),
            );
          } catch (error) {
            return {
              ok: false,
              atomic: false,
              committedCount: results.length,
              failedIndex: index,
              results,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        }
        return {
          ok: true,
          atomic: false,
          committedCount: results.length,
          results,
        };
      },
    },
    {
      name: 'expense-delete',
      description:
        'Destructive: permanently deletes one expense from the trip. Call only after the user explicitly confirms the exact expense deletion.',
      inputSchema: {
        type: 'object',
        properties: {
          expenseId: str('The expense id to permanently delete.'),
          confirmDelete: deletionConfirmationSchema(),
        },
        required: ['expenseId', 'confirmDelete'],
      },
      async execute(input) {
        assertWritable('deleting an expense');
        requireAuthUser();
        const expenseId = asStr(input.expenseId, 'expenseId');
        if (!useBoundStore.getState().expense[expenseId])
          throw new Error(`Expense ${expenseId} is not loaded.`);
        requireDeletionConfirmation(input.confirmDelete);
        await dbDeleteExpense(expenseId);
        return { ok: true, deletedExpenseId: expenseId };
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
        'Updates an existing expense (amount, title, description, date, currency, or conversion). Conversion values must be provided together. Only provided fields are changed.',
      inputSchema: {
        type: 'object',
        properties: {
          expenseId: str('The expense id.'),
          title: str('New title.'),
          amount: num('New amount.'),
          currency: str('New ISO 4217 currency.'),
          currencyConversionFactor: num(
            'New conversion factor. Provide together with amountInOriginCurrency.',
          ),
          amountInOriginCurrency: num(
            'New amount in the trip origin currency. Provide together with currencyConversionFactor.',
          ),
          description: str('New description.'),
          timestampIncurred: epochOrIso(
            'New incurred date (ISO-8601 or epoch ms).',
          ),
          timeZoneIncurred: str('New IANA incurred time zone.'),
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
        const hasConversionUpdate =
          input.currencyConversionFactor !== undefined ||
          input.amountInOriginCurrency !== undefined;
        const conversion = hasConversionUpdate
          ? resolveExpenseConversion({
              amount,
              currency:
                (input.currency as string | undefined)?.toUpperCase() ??
                existing.currency,
              originCurrency:
                useBoundStore.getState().trip[existing.tripId]?.originCurrency,
              currencyConversionFactor: asOptNum(
                input.currencyConversionFactor,
                'currencyConversionFactor',
              ),
              amountInOriginCurrency: asOptNum(
                input.amountInOriginCurrency,
                'amountInOriginCurrency',
              ),
            })
          : {
              currencyConversionFactor: existing.currencyConversionFactor,
              amountInOriginCurrency: existing.amountInOriginCurrency,
            };
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
          ...conversion,
          timeZoneIncurred:
            asOptStr(input.timeZoneIncurred, 'timeZoneIncurred') ??
            existing.timeZoneIncurred,
        });
        return { ok: true, expenseId: id };
      },
    },
  ];
}
