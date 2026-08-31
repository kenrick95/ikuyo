import { describe, expect, it, vi } from 'vitest';

vi.mock('../data/db', () => ({ db: {} }));

import { createAccommodationTools } from './accommodation.tools';
import { createActivityTools } from './activity.tools';
import { createCommentTools } from './comment.tools';
import { createExpenseTools, resolveExpenseConversion } from './expense.tools';
import { createMacroplanTools } from './macroplan.tools';
import { createPlaceTools } from './place.tools';
import { createTaskTools } from './task.tools';
import { createTripTools } from './trip.tools';

function named(name: string, tools: ReturnType<typeof createTripTools>) {
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`Missing tool ${name}`);
  return tool;
}

describe('WebMCP reliability contracts', () => {
  it('exposes trip context hydration and read-only place candidates', () => {
    expect(
      named('trip-open', createTripTools()).annotations?.readOnlyHint,
    ).toBe(true);
    expect(createPlaceTools()[0]).toMatchObject({
      name: 'place-search',
      annotations: { readOnlyHint: true },
    });
  });

  it('exposes archived-trip listing and owner archive state controls', () => {
    const tools = createTripTools();
    expect(named('trip-list-archived', tools)).toMatchObject({
      annotations: { readOnlyHint: true },
    });
    const archive = named('trip-set-archived', tools);
    expect(archive.inputSchema.required).toContain('archived');
    expect(archive.inputSchema.properties.archived).toMatchObject({
      type: 'boolean',
    });
  });

  it('exposes bounded activity batches and itinerary relationship fields', () => {
    const tool = named('activity-create-many', createActivityTools());
    const activities = tool.inputSchema.properties.activities as {
      maxItems: number;
      items: { properties: Record<string, unknown> };
    };
    expect(activities.maxItems).toBe(50);
    expect(activities.items.properties).toHaveProperty('idempotencyKey');
    expect(activities.items.properties).toHaveProperty('dayPlanId');
    expect(activities.items.properties).toHaveProperty('planningStatus');
    expect(activities.items.properties).toHaveProperty('place');
    expect(tool.description).toContain('place-search');
    expect(tool.description).toContain('accommodation-create');
  });

  it('accepts place-search candidates and trip-date defaults for lodging', () => {
    const tool = named('accommodation-create', createAccommodationTools());
    expect(tool.inputSchema.required).toEqual(['name']);
    expect(tool.inputSchema.properties).toHaveProperty('place');
    expect(tool.description).toContain('activity-create');
    expect(tool.description).toContain('trip bounds');
  });

  it('returns a copy-ready place object for mapped writes', () => {
    const tool = named('place-search', createPlaceTools());
    expect(tool.description).toContain('candidate.place');
    expect(tool.description).toContain('Google Maps');
  });

  it('exposes bounded day-plan batches with retry keys', () => {
    const tool = named('day-plan-create-many', createMacroplanTools());
    const dayPlans = tool.inputSchema.properties.dayPlans as {
      maxItems: number;
      items: { properties: Record<string, unknown> };
    };
    expect(dayPlans.maxItems).toBe(31);
    expect(dayPlans.items.properties).toHaveProperty('idempotencyKey');
  });

  it('allows unconverted foreign-currency expenses and fills same-currency conversions', () => {
    const tool = named('expense-create', createExpenseTools());
    expect(tool.inputSchema.properties).toHaveProperty(
      'currencyConversionFactor',
    );
    expect(tool.inputSchema.properties).toHaveProperty(
      'amountInOriginCurrency',
    );
    expect(tool.description).toContain('look up the exchange rate online');
    expect(
      resolveExpenseConversion({
        amount: 1_000,
        currency: 'JPY',
        originCurrency: 'SGD',
        currencyConversionFactor: undefined,
        amountInOriginCurrency: undefined,
      }),
    ).toEqual({
      currencyConversionFactor: undefined,
      amountInOriginCurrency: undefined,
    });
    expect(
      resolveExpenseConversion({
        amount: 1_000,
        currency: 'JPY',
        originCurrency: 'JPY',
        currencyConversionFactor: undefined,
        amountInOriginCurrency: undefined,
      }),
    ).toEqual({ currencyConversionFactor: 1, amountInOriginCurrency: 1_000 });
    expect(() =>
      resolveExpenseConversion({
        amount: 1_000,
        currency: 'JPY',
        originCurrency: 'SGD',
        currencyConversionFactor: 110,
        amountInOriginCurrency: undefined,
      }),
    ).toThrow('must be provided together');
  });

  it('exposes bounded batch tools for repeated trip entities', () => {
    const batches = [
      [createTaskTools(), 'task-create-many', 'tasks'],
      [createTaskTools(), 'task-list-create-many', 'taskLists'],
      [createExpenseTools(), 'expense-create-many', 'expenses'],
      [
        createAccommodationTools(),
        'accommodation-create-many',
        'accommodations',
      ],
      [createCommentTools(), 'comment-add-many', 'comments'],
    ] as const;
    for (const [tools, name, field] of batches) {
      const tool = tools.find((candidate) => candidate.name === name);
      expect(tool?.inputSchema.properties[field]).toMatchObject({
        type: 'array',
        maxItems: 50,
      });
      expect(tool?.description).toContain('non-atomic');
    }
    expect(
      createTaskTools().some(
        (tool) => tool.name === 'task-list-create-with-tasks',
      ),
    ).toBe(true);
  });

  it('marks deletion tools as destructive and requires explicit confirmation', () => {
    const deletionTools = [
      [createActivityTools(), 'activity-delete'],
      [createAccommodationTools(), 'accommodation-delete'],
      [createExpenseTools(), 'expense-delete'],
      [createTaskTools(), 'task-delete'],
      [createTaskTools(), 'task-list-delete'],
      [createMacroplanTools(), 'day-plan-delete'],
      [createCommentTools(), 'comment-delete'],
    ] as const;
    for (const [tools, name] of deletionTools) {
      const tool = tools.find((candidate) => candidate.name === name);
      expect(tool?.description).toContain('Destructive:');
      expect(tool?.inputSchema.required).toContain('confirmDelete');
      expect(tool?.inputSchema.properties.confirmDelete).toMatchObject({
        enum: ['DELETE'],
      });
    }
  });
});
