import { useBoundStore } from '../data/store';
import { createAccommodationTools } from './accommodation.tools';
import { createActivityTools } from './activity.tools';
import { createAuthTools } from './auth.tools';
import { createCommentTools } from './comment.tools';
import { createExpenseTools } from './expense.tools';
import { createMacroplanTools } from './macroplan.tools';
import type { WebMCPTool } from './modelContext';
import { createTaskTools } from './task.tools';
import { createTripTools } from './trip.tools';
import { useWebMCPTools } from './useWebMCPTools';

/**
 * Top-level WebMCP wiring. Rendered once inside the Router in App.
 *
 * WebMCP is a no-op on browsers that don't support it (`useWebMCPTools` gates
 * on feature detection), so normal use is completely unaffected.
 *
 * Tool registration is organised by page context (per WebMCP guidance):
 *   - Always: auth + account-preferences tools.
 *   - When authenticated: trip read/list/create tools.
 *   - When a trip is open & loaded: trip mutation + entity tools
 *     (activity, accommodation, task, expense, macroplan, comment).
 */
export function WebMCPTools() {
  const authUser = useBoundStore((state) => state.authUser);
  const currentTripId = useBoundStore((state) => state.currentTripId);
  const tripLoaded = useBoundStore((state) =>
    currentTripId ? Boolean(state.trip[currentTripId]) : false,
  );

  // Always-registered tools (auth + account).
  const baseTools: WebMCPTool[] = [...createAuthTools()];
  useWebMCPTools(baseTools, []);

  // Authenticated: trip read/list/create + account preferences (already in
  // baseTools) — register the trip subset that doesn't need an open trip.
  const authenticated = Boolean(authUser);
  const tripReadWriteTools: WebMCPTool[] = authenticated
    ? createTripTools().filter((t) =>
        ['trip-list', 'trip-get', 'trip-create'].includes(t.name),
      )
    : [];
  useWebMCPTools(tripReadWriteTools, [authenticated]);

  // Trip open & loaded: full trip mutation tools + all entity tools.
  const entityTools: WebMCPTool[] = tripLoaded
    ? [
        ...createTripTools().filter(
          (t) => !['trip-list', 'trip-get', 'trip-create'].includes(t.name),
        ),
        ...createActivityTools(),
        ...createAccommodationTools(),
        ...createTaskTools(),
        ...createExpenseTools(),
        ...createMacroplanTools(),
        ...createCommentTools(),
      ]
    : [];
  useWebMCPTools(entityTools, [currentTripId, tripLoaded]);

  return null;
}
