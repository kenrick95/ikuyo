import { get as apiGet, type CursorPage } from '../data/apiClient';
import { assertWritable } from '../data/backendConfig';
import { useBoundStore } from '../data/store';
import {
  dbAddTrip,
  dbAddUserToTrip,
  dbSetTripArchived,
  dbUpdateTrip,
  dbUpdateTripSectionVisibility,
  dbUpdateTripSharingLevel,
  dbUpdateUserFromTrip,
} from '../Trip/db';
import {
  TripSharingLevel,
  type TripSharingLevelType,
} from '../Trip/tripSharingLevel';
import { TripUserRole } from '../User/TripUserRole';
import { idempotencyKeySchema, runIdempotent } from './idempotency';
import type { WebMCPTool } from './modelContext';
import { asOptStr, asStr, bool, int, str, strEnum } from './schema';
import { epochToTripDate, resolveTripDates } from './tripDates';

type TripSummary = {
  id: string;
  title: string;
  timestampStart: number;
  timestampEnd: number;
  timeZone: string;
  archivedAt?: number;
};

function requireAuthUser(): { id: string } {
  const { authUser, currentUser } = useBoundStore.getState();
  if (!authUser || !currentUser) {
    throw new Error('Not authenticated. Call auth-login first.');
  }
  return currentUser;
}

function requireCurrentTrip(): string {
  const { currentTripId, trip } = useBoundStore.getState();
  if (!currentTripId || !trip[currentTripId]) {
    throw new Error(
      'No trip is open. Provide a tripId or open a trip page first.',
    );
  }
  return currentTripId;
}

function tripSnapshot(id: string): Record<string, unknown> {
  const { trip } = useBoundStore.getState();
  const t = trip[id];
  if (!t) throw new Error(`Trip ${id} is not loaded in the current context.`);
  return {
    id: t.id,
    title: t.title,
    timestampStart: t.timestampStart,
    timestampEnd: t.timestampEnd,
    timeZone: t.timeZone,
    region: t.region,
    currency: t.currency,
    sharingLevel: t.sharingLevel,
    activityIds: t.activityIds,
    accommodationIds: t.accommodationIds,
    macroplanIds: t.macroplanIds,
    expenseIds: t.expenseIds,
    taskListIds: t.taskListIds,
    tripUserIds: t.tripUserIds,
    commentGroupIds: t.commentGroupIds,
    archivedAt: t.archivedAt,
  };
}

async function listTripsFromApi(): Promise<TripSummary[]> {
  const now = Date.now();
  const load = async (status: 'active' | 'past') => {
    const params = new URLSearchParams({
      now: String(now),
      status,
      limit: '500',
    });
    const page = await apiGet<CursorPage<TripSummary>>(`/api/trips?${params}`);
    return page.data;
  };
  const [active, past] = await Promise.all([load('active'), load('past')]);
  return [...active, ...past];
}

async function listArchivedTripsFromApi(): Promise<TripSummary[]> {
  const page = await apiGet<CursorPage<TripSummary>>(
    '/api/trips?status=archived&limit=100',
  );
  return page.data;
}

export function createTripTools(): WebMCPTool[] {
  // Owners cannot be assigned through the UI or backend member endpoints.
  const memberRoleValues = [TripUserRole.Viewer, TripUserRole.Editor];
  return [
    {
      name: 'trip-list',
      description:
        'Lists the current user’s non-archived trips (id, title, dates, timezone). Fetches the latest from the backend.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      async execute() {
        requireAuthUser();
        const trips = await listTripsFromApi();
        return { ok: true, trips };
      },
    },
    {
      name: 'trip-list-archived',
      description:
        'Lists the current user’s archived trips (id, title, dates, timezone, archivedAt), newest archived first. Fetches the latest from the backend.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      async execute() {
        requireAuthUser();
        const trips = await listArchivedTripsFromApi();
        return { ok: true, trips };
      },
    },
    {
      name: 'trip-open',
      description:
        'Loads a known trip id into the non-visual WebMCP context and returns its snapshot. Use this after trip-list; it does not navigate or replace the visible route. Trip-scoped tools become discoverable immediately after loading completes.',
      inputSchema: {
        type: 'object',
        properties: { tripId: str('The trip id to load.') },
        required: ['tripId'],
      },
      annotations: { readOnlyHint: true },
      async execute(input) {
        requireAuthUser();
        const tripId = asStr(input.tripId, 'tripId');
        await useBoundStore.getState().loadTrip(tripId);
        return { ok: true, trip: tripSnapshot(tripId) };
      },
    },
    {
      name: 'trip-get',
      description:
        'Returns a trip and its child entity ids from locally loaded state. Call trip-open first when the trip is not loaded.',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('The trip id. Defaults to the currently open trip.'),
        },
      },
      annotations: { readOnlyHint: true },
      execute(input) {
        requireAuthUser();
        const tripId =
          (input.tripId as string | undefined) ?? requireCurrentTrip();
        return { ok: true, trip: tripSnapshot(tripId) };
      },
    },
    {
      name: 'trip-create',
      description:
        'Creates a new trip owned by the current user. Provide title, startDate and endDate (YYYY-MM-DD, endDate is the last full day), timeZone (IANA), region and currency (ISO codes).',
      inputSchema: {
        type: 'object',
        properties: {
          title: str('Trip title.'),
          idempotencyKey: idempotencyKeySchema(),
          startDate: str('First day of the trip (YYYY-MM-DD).'),
          endDate: str('Last full day of the trip (YYYY-MM-DD).'),
          timeZone: str('IANA trip time zone, e.g. Asia/Tokyo.'),
          region: str('ISO 3166-1 alpha-2 destination region, e.g. JP.'),
          currency: str('ISO 4217 destination currency, e.g. JPY.'),
          originRegion: str(
            'Optional ISO 3166-1 alpha-2 home region. Defaults to region.',
          ),
          originCurrency: str(
            'Optional ISO 4217 home currency. Defaults to currency.',
          ),
          originTimeZone: str(
            'Optional IANA home time zone. Defaults to timeZone.',
          ),
        },
        required: [
          'title',
          'startDate',
          'endDate',
          'timeZone',
          'region',
          'currency',
        ],
      },
      async execute(input) {
        assertWritable('creating a trip');
        const user = requireAuthUser();
        const title = asStr(input.title, 'title');
        const timeZone = asStr(input.timeZone, 'timeZone');
        const region = asStr(input.region, 'region').toUpperCase();
        const currency = asStr(input.currency, 'currency').toUpperCase();
        const { timestampStart, timestampEnd } = resolveTripDates(
          input.startDate,
          input.endDate,
          timeZone,
        );
        const data = {
          title,
          timestampStart,
          timestampEnd,
          timeZone,
          region,
          currency,
          originRegion:
            asOptStr(input.originRegion, 'originRegion')?.toUpperCase() ??
            region,
          originCurrency:
            asOptStr(input.originCurrency, 'originCurrency')?.toUpperCase() ??
            currency,
          originTimeZone:
            asOptStr(input.originTimeZone, 'originTimeZone') ?? timeZone,
          sharingLevel: TripSharingLevel.Private,
        };
        return runIdempotent(
          'trip-create',
          user.id,
          input.idempotencyKey,
          input,
          async () => {
            const result = await dbAddTrip(data, { userId: user.id });
            return { ok: true, id: result.id, tripId: result.id };
          },
        );
      },
    },
    {
      name: 'trip-update',
      description:
        'Updates the basic details of an existing trip (title, dates, timezone, region, currency). Only provided fields are changed.',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id. Defaults to the currently open trip.'),
          title: str('New title.'),
          startDate: str('New first day (YYYY-MM-DD).'),
          endDate: str('New last full day (YYYY-MM-DD).'),
          timeZone: str('New IANA time zone.'),
          region: str('New ISO 3166-1 alpha-2 region.'),
          currency: str('New ISO 4217 currency.'),
        },
      },
      async execute(input) {
        assertWritable('updating a trip');
        requireAuthUser();
        const tripId =
          (input.tripId as string | undefined) ?? requireCurrentTrip();
        const state = useBoundStore.getState();
        const existing = state.trip[tripId];
        if (!existing) throw new Error(`Trip ${tripId} is not loaded.`);
        const timeZone =
          asOptStr(input.timeZone, 'timeZone') ?? existing.timeZone;
        const dates =
          input.startDate !== undefined ||
          input.endDate !== undefined ||
          input.timeZone !== undefined
            ? resolveTripDates(
                (input.startDate as string | undefined) ??
                  epochToTripDate(existing.timestampStart, existing.timeZone),
                (input.endDate as string | undefined) ??
                  epochToTripDate(
                    existing.timestampEnd,
                    existing.timeZone,
                    true,
                  ),
                timeZone,
              )
            : {
                timestampStart: existing.timestampStart,
                timestampEnd: existing.timestampEnd,
              };
        await dbUpdateTrip({
          id: tripId,
          title: asOptStr(input.title, 'title') ?? existing.title,
          timestampStart: dates.timestampStart,
          timestampEnd: dates.timestampEnd,
          timeZone,
          region:
            asOptStr(input.region, 'region')?.toUpperCase() ?? existing.region,
          currency:
            asOptStr(input.currency, 'currency')?.toUpperCase() ??
            existing.currency,
          originRegion: existing.originRegion ?? existing.region,
          originCurrency: existing.originCurrency ?? existing.currency,
          originTimeZone: existing.originTimeZone ?? existing.timeZone,
          sharingLevel: existing.sharingLevel,
        });
        return { ok: true, trip: tripSnapshot(tripId) };
      },
    },
    {
      name: 'trip-update-sharing',
      description:
        'Sets the trip sharing level: private (0), public-unlisted (2), or public-listed (3).',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id. Defaults to the currently open trip.'),
          sharingLevel: int(
            'Sharing level: 0=private, 2=public (unlisted), 3=public (listed in directory).',
          ),
        },
        required: ['sharingLevel'],
      },
      async execute(input) {
        assertWritable('changing trip sharing');
        requireAuthUser();
        const tripId =
          (input.tripId as string | undefined) ?? requireCurrentTrip();
        const level = Number(input.sharingLevel) as TripSharingLevelType;
        if (![0, 2, 3].includes(level)) {
          throw new Error('sharingLevel must be 0, 2, or 3');
        }
        await dbUpdateTripSharingLevel(tripId, level);
        return { ok: true, tripId, sharingLevel: level };
      },
    },
    {
      name: 'trip-set-archived',
      description:
        'Archives or unarchives a trip. Only owners may change this state. Archiving makes trip content read-only; sharing, members, and deletion remain available.',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id. Defaults to the currently open trip.'),
          archived: bool('True to archive, false to unarchive.'),
        },
        required: ['archived'],
      },
      async execute(input) {
        assertWritable('changing trip archive state');
        requireAuthUser();
        const tripId =
          (input.tripId as string | undefined) ?? requireCurrentTrip();
        if (typeof input.archived !== 'boolean') {
          throw new Error('archived is required and must be a boolean');
        }
        await dbSetTripArchived(tripId, input.archived);
        return { ok: true, tripId, archived: input.archived };
      },
    },
    {
      name: 'trip-update-sections',
      description:
        'Shows/hides expenses, tasks, and comments for public visitors and for invited viewers.',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id. Defaults to the currently open trip.'),
          publicShowExpenses: strEnum(
            'Visibility of expenses to public visitors.',
            ['true', 'false'],
          ),
          publicShowTasks: strEnum('Visibility of tasks to public visitors.', [
            'true',
            'false',
          ]),
          publicShowComments: strEnum(
            'Visibility of comments to public visitors.',
            ['true', 'false'],
          ),
          viewerShowExpenses: strEnum(
            'Visibility of expenses to invited viewers.',
            ['true', 'false'],
          ),
          viewerShowTasks: strEnum('Visibility of tasks to invited viewers.', [
            'true',
            'false',
          ]),
          viewerShowComments: strEnum(
            'Visibility of comments to invited viewers.',
            ['true', 'false'],
          ),
        },
      },
      async execute(input) {
        assertWritable('changing trip section visibility');
        requireAuthUser();
        const tripId =
          (input.tripId as string | undefined) ?? requireCurrentTrip();
        const parse = (key: string): boolean | undefined =>
          input[key] === undefined ? undefined : input[key] === 'true';
        await dbUpdateTripSectionVisibility(tripId, {
          publicShowExpenses: parse('publicShowExpenses'),
          publicShowTasks: parse('publicShowTasks'),
          publicShowComments: parse('publicShowComments'),
          viewerShowExpenses: parse('viewerShowExpenses'),
          viewerShowTasks: parse('viewerShowTasks'),
          viewerShowComments: parse('viewerShowComments'),
        });
        return { ok: true, tripId };
      },
    },
    {
      name: 'trip-add-member',
      description:
        'Adds a member to a trip by email with a role (editor or viewer).',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id. Defaults to the currently open trip.'),
          email: str('Email of the member to invite.'),
          role: strEnum('Member role (editor or viewer).', memberRoleValues),
        },
        required: ['email', 'role'],
      },
      async execute(input) {
        assertWritable('adding a member');
        requireAuthUser();
        const tripId =
          (input.tripId as string | undefined) ?? requireCurrentTrip();
        const email = asStr(input.email, 'email').toLowerCase();
        const role = asStr(input.role, 'role') as TripUserRole;
        if (!memberRoleValues.includes(role)) {
          throw new Error(`role must be one of ${memberRoleValues.join(', ')}`);
        }
        await dbAddUserToTrip({ tripId, userEmail: email, userRole: role });
        return { ok: true, tripId, email, role };
      },
    },
    {
      name: 'trip-update-member',
      description: 'Changes the role of an existing trip member.',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id. Defaults to the currently open trip.'),
          email: str('Email of the member.'),
          role: strEnum(
            'New member role (editor or viewer).',
            memberRoleValues,
          ),
        },
        required: ['email', 'role'],
      },
      async execute(input) {
        assertWritable('updating a member');
        requireAuthUser();
        const tripId =
          (input.tripId as string | undefined) ?? requireCurrentTrip();
        const email = asStr(input.email, 'email').toLowerCase();
        const role = asStr(input.role, 'role') as TripUserRole;
        if (!memberRoleValues.includes(role)) {
          throw new Error(`role must be one of ${memberRoleValues.join(', ')}`);
        }
        // Look up the current role so validation of a role change works server-side.
        const members = Object.values(useBoundStore.getState().tripUser).filter(
          (m) => m.tripId === tripId && m.email.toLowerCase() === email,
        );
        await dbUpdateUserFromTrip({
          tripId,
          userEmail: email,
          userRole: role,
          previousUserRole: (members[0]?.role as TripUserRole) ?? role,
        });
        return { ok: true, tripId, email, role };
      },
    },
  ];
}
