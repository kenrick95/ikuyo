import type { DbTripQueryReturnType } from '../Trip/store/types';

// biome-ignore lint/suspicious/noExplicitAny: Laravel payload is normalized field-by-field below.
type ApiTrip = Record<string, any>;

/** MySQL DECIMAL/BIGINT values can arrive as strings; coerce to numbers. */
const toNum = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

/** Convert Laravel's resource names/columns into the existing trip-store shape. */
export function mapApiTrip(trip: ApiTrip): DbTripQueryReturnType {
  const map = (row: ApiTrip): ApiTrip => ({
    ...row,
    tripId: row.trip_id,
    taskListId: row.task_list_id,
    commentGroupId: row.comment_group_id,
    userId: row.user_id,
    dayPlanId: row.dayPlanId ?? row.macroplanId ?? row.macro_plan_id,
    planningStatus: row.planningStatus ?? row.planning_status,
    timestampStart: toNum(row.timestampStart ?? row.timestamp_start_ms),
    timestampEnd: toNum(row.timestampEnd ?? row.timestamp_end_ms),
    timeZone: row.timeZone ?? row.timezone,
    createdAt: toNum(row.createdAt ?? row.created_at_ms),
    lastUpdatedAt: toNum(row.lastUpdatedAt ?? row.updated_at_ms),
    timestampCheckIn: toNum(row.timestampCheckIn ?? row.check_in_ms),
    timestampCheckOut: toNum(row.timestampCheckOut ?? row.check_out_ms),
    timeZoneCheckIn: row.timeZoneCheckIn ?? row.tz_check_in,
    timeZoneCheckOut: row.timeZoneCheckOut ?? row.tz_check_out,
    phoneNumber: row.phoneNumber ?? row.phone_number,
    locationLat: toNum(row.locationLat ?? row.location_lat),
    locationLng: toNum(row.locationLng ?? row.location_lng),
    locationZoom: toNum(row.locationZoom ?? row.location_zoom),
    locationDestination: row.locationDestination ?? row.location_destination,
    locationDestinationLat: toNum(
      row.locationDestinationLat ?? row.location_destination_lat,
    ),
    locationDestinationLng: toNum(
      row.locationDestinationLng ?? row.location_destination_lng,
    ),
    locationDestinationZoom: toNum(
      row.locationDestinationZoom ?? row.location_destination_zoom,
    ),
    timeZoneStart: row.timeZoneStart ?? row.timezone_start,
    timeZoneEnd: row.timeZoneEnd ?? row.timezone_end,
    amountInOriginCurrency: toNum(
      row.amountInOriginCurrency ?? row.amount_in_origin_currency,
    ),
    currencyConversionFactor: toNum(
      row.currencyConversionFactor ?? row.currency_conversion_factor,
    ),
    amount: toNum(row.amount),
    timestampIncurred: toNum(row.timestampIncurred ?? row.incurred_at_ms),
    timeZoneIncurred: row.timeZoneIncurred ?? row.timezone_incurred,
    dueAt: toNum(row.dueAt ?? row.due_at_ms),
    completedAt: toNum(row.completedAt ?? row.completed_at_ms),
  });

  return {
    ...map(trip),
    activity: (trip.activity ?? trip.activities ?? []).map(map),
    accommodation: (trip.accommodation ?? trip.accommodations ?? []).map(map),
    macroplan: (trip.macroplan ?? trip.macroplans ?? []).map(map),
    expense: (trip.expense ?? trip.expenses ?? []).map(map),
    taskList: (trip.taskList ?? trip.taskLists ?? []).map((list: ApiTrip) => ({
      ...map(list),
      task: (list.task ?? list.tasks ?? []).map(map),
    })),
    tripUser: (trip.tripUser ?? trip.tripUsers ?? []).map(
      (member: ApiTrip) => ({
        ...map(member),
        role: roleName(member.role),
        user: member.user ? [map(member.user)] : [],
      }),
    ),
    commentGroup: (trip.commentGroup ?? trip.commentGroups ?? []).map(
      (group: ApiTrip) => ({
        ...map(group),
        comment: (group.comment ?? group.comments ?? []).map(
          (comment: ApiTrip) => ({
            ...map(comment),
            user: comment.user ? map(comment.user) : undefined,
          }),
        ),
        object: group.object ? mapCommentObject(group.object) : undefined,
      }),
    ),
  } as DbTripQueryReturnType;
}

function roleName(role: unknown): string {
  if (role === 0 || role === '0') return 'owner';
  if (role === 1 || role === '1') return 'editor';
  return 'viewer';
}

function mapCommentObject(object: ApiTrip): ApiTrip {
  const type =
    typeof object.type === 'string'
      ? object.type
      : objectTypeName(object.object_type);
  // The backend serializes the target as a dynamic relation (e.g.
  // activity: [{ id, title }]), but an `object_id` may also be present. Prefer
  // the relation so comments keep the entity they belong to.
  const relation = Array.isArray(object[type]) ? object[type] : undefined;
  const target =
    relation && relation.length > 0
      ? relation
      : object.object_id
        ? [{ id: object.object_id, title: object.title ?? object.name ?? '' }]
        : [];
  return {
    ...object,
    id: object.id,
    createdAt: object.createdAt ?? object.created_at_ms,
    lastUpdatedAt: object.lastUpdatedAt ?? object.updated_at_ms,
    type,
    [type]: target,
  };
}

function objectTypeName(value: unknown): string {
  return (
    ['trip', 'activity', 'accommodation', 'macroplan', 'expense', 'task'][
      Number(value)
    ] ?? 'trip'
  );
}
