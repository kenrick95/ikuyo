import type { DbTripQueryReturnType } from '../Trip/store/types';

type ApiTrip = Record<string, any>;

/** Convert Laravel's resource names/columns into the existing trip-store shape. */
export function mapApiTrip(trip: ApiTrip): DbTripQueryReturnType {
  const map = (row: ApiTrip): ApiTrip => ({
    ...row,
    tripId: row.trip_id,
    taskListId: row.task_list_id,
    commentGroupId: row.comment_group_id,
    userId: row.user_id,
    timestampStart: row.timestampStart ?? row.timestamp_start_ms,
    timestampEnd: row.timestampEnd ?? row.timestamp_end_ms,
    timeZone: row.timeZone ?? row.timezone,
    createdAt: row.createdAt ?? row.created_at_ms,
    lastUpdatedAt: row.lastUpdatedAt ?? row.updated_at_ms,
    timestampCheckIn: row.timestampCheckIn ?? row.check_in_ms,
    timestampCheckOut: row.timestampCheckOut ?? row.check_out_ms,
    timeZoneCheckIn: row.timeZoneCheckIn ?? row.tz_check_in,
    timeZoneCheckOut: row.timeZoneCheckOut ?? row.tz_check_out,
    phoneNumber: row.phoneNumber ?? row.phone_number,
    locationLat: row.locationLat ?? row.location_lat,
    locationLng: row.locationLng ?? row.location_lng,
    locationZoom: row.locationZoom ?? row.location_zoom,
    locationDestination: row.locationDestination ?? row.location_destination,
    locationDestinationLat:
      row.locationDestinationLat ?? row.location_destination_lat,
    locationDestinationLng:
      row.locationDestinationLng ?? row.location_destination_lng,
    locationDestinationZoom:
      row.locationDestinationZoom ?? row.location_destination_zoom,
    timeZoneStart: row.timeZoneStart ?? row.timezone_start,
    timeZoneEnd: row.timeZoneEnd ?? row.timezone_end,
    amountInOriginCurrency:
      row.amountInOriginCurrency ?? row.amount_in_origin_currency,
    currencyConversionFactor:
      row.currencyConversionFactor ?? row.currency_conversion_factor,
    timestampIncurred: row.timestampIncurred ?? row.incurred_at_ms,
    timeZoneIncurred: row.timeZoneIncurred ?? row.timezone_incurred,
    dueAt: row.dueAt ?? row.due_at_ms,
    completedAt: row.completedAt ?? row.completed_at_ms,
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
    tripUser: (trip.tripUser ?? []).map((member: ApiTrip) => ({
      ...map(member),
      user: member.user ? map(member.user) : undefined,
    })),
    commentGroup: (trip.commentGroup ?? trip.commentGroups ?? []).map(
      (group: ApiTrip) => ({
        ...map(group),
        comment: (group.comment ?? group.comments ?? []).map(
          (comment: ApiTrip) => ({
            ...map(comment),
            user: comment.user ? map(comment.user) : undefined,
          }),
        ),
        object: group.object ? map(group.object) : undefined,
      }),
    ),
  } as DbTripQueryReturnType;
}
