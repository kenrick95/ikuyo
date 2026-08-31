import { useBoundStore } from '../data/store';
import { canModifyTripContent, isTripOwner } from '../Trip/permissions';
import { createAccommodationTools } from './accommodation.tools';
import { createActivityTools } from './activity.tools';
import { createAuthTools } from './auth.tools';
import { createCommentTools } from './comment.tools';
import { createExpenseTools } from './expense.tools';
import { createMacroplanTools } from './macroplan.tools';
import type { WebMCPTool } from './modelContext';
import { createPlaceTools } from './place.tools';
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
  const currentUser = useBoundStore((state) => state.currentUser);
  const currentTripId = useBoundStore((state) => state.currentTripId);
  const currentTrip = useBoundStore((state) =>
    currentTripId ? state.trip[currentTripId] : undefined,
  );
  const authenticated = Boolean(authUser && currentUser);
  const tripLoaded = Boolean(currentTrip);
  const canEdit =
    currentTrip?.isCurrentUserTripMember === true &&
    canModifyTripContent(currentTrip);
  const canManage =
    currentTrip?.isCurrentUserTripMember === true && isTripOwner(currentTrip);

  // Do not advertise login/signup to an already authenticated assistant, or
  // account/logout tools to a logged-out one.
  const authToolNames = authenticated
    ? ['auth-get-current-user', 'auth-logout', 'account-update-preferences']
    : ['auth-get-current-user', 'auth-login', 'auth-signup'];
  const authTools = createAuthTools().filter((tool) =>
    authToolNames.includes(tool.name),
  );
  useWebMCPTools(authTools, [authenticated]);

  // Authenticated: trip list/create/get tools that do not require a writable
  // trip membership.
  const tripReadWriteTools: WebMCPTool[] = authenticated
    ? [
        ...createTripTools().filter((tool) =>
          [
            'trip-list',
            'trip-list-archived',
            'trip-open',
            'trip-get',
            'trip-create',
          ].includes(tool.name),
        ),
        ...createPlaceTools(),
      ]
    : [];
  useWebMCPTools(tripReadWriteTools, [authenticated]);

  const allEntityTools = [
    ...createActivityTools(),
    ...createAccommodationTools(),
    ...createTaskTools(),
    ...createExpenseTools(),
    ...createMacroplanTools(),
    ...createCommentTools(),
  ];
  const tripTools = createTripTools();
  const entityTools: WebMCPTool[] =
    authenticated && tripLoaded
      ? [
          ...allEntityTools.filter(
            (tool) => tool.annotations?.readOnlyHint === true,
          ),
          ...(canEdit
            ? [
                ...tripTools.filter((tool) => tool.name === 'trip-update'),
                ...allEntityTools.filter(
                  (tool) => tool.annotations?.readOnlyHint !== true,
                ),
              ]
            : []),
          ...(canManage
            ? tripTools.filter((tool) =>
                [
                  'trip-update-sharing',
                  'trip-update-sections',
                  'trip-set-archived',
                  'trip-add-member',
                  'trip-update-member',
                ].includes(tool.name),
              )
            : []),
        ]
      : [];
  useWebMCPTools(entityTools, [
    authenticated,
    currentTripId,
    tripLoaded,
    canEdit,
    canManage,
  ]);

  return null;
}
