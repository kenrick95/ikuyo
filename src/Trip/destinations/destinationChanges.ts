import { toFormat } from '../../common/dateTime/temporalFormatter';
import type { TripDestination } from './destinations';

export type DestinationChange = Pick<
  TripDestination,
  'id' | 'name' | 'startsAtMs'
> & { time: string };

/** Groups destination handoffs by their date in the selected display zone. */
export function destinationChangesByDate(
  destinations: readonly TripDestination[] | undefined,
  timeZone: string | undefined,
): Map<string, DestinationChange[]> {
  const days = new Map<string, DestinationChange[]>();
  if (!destinations?.length || !timeZone) return days;

  for (const { id, name, startsAtMs } of destinations.toSorted(
    (first, second) => first.startsAtMs - second.startsAtMs,
  )) {
    const local =
      Temporal.Instant.fromEpochMilliseconds(startsAtMs).toZonedDateTimeISO(
        timeZone,
      );
    const date = local.toPlainDate().toString();
    const change = { id, name, startsAtMs, time: toFormat('HH:mm', local) };
    const day = days.get(date);
    if (day) day.push(change);
    else days.set(date, [change]);
  }
  return days;
}
