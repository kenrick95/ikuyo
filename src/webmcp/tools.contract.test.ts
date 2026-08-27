import { describe, expect, it, vi } from 'vitest';

vi.mock('../data/db', () => ({ db: {} }));

import { createActivityTools } from './activity.tools';
import { createMacroplanTools } from './macroplan.tools';
import { createPlaceTools } from './place.tools';
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
});
