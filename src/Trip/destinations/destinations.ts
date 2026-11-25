import { REGIONS_MAP, type RegionCode } from '../../data/intl/regions';

export type TripDestination = {
  id: string;
  name: string;
  region: string;
  timeZone: string;
  currency: string;
  startsOn: string;
  startsAtTime: string | null;
  startOffset: string | null;
  startsAtMs: number;
};

export type DestinationDraft = Omit<TripDestination, 'startsAtMs'>;

export type DestinationTrip = {
  timestampStart: number;
  region: string;
  currency: string;
  timeZone: string;
  destinations?: TripDestination[];
};

/** Looks up the display name for a region code, falling back to the code. */
export function regionName(region: string): string {
  return Object.hasOwn(REGIONS_MAP, region)
    ? REGIONS_MAP[region as RegionCode]
    : region;
}

/**
 * Finds the possible starts for the destination's local date and time.
 * A date without a time uses the start of the local day. A repeated time
 * yields both offsets in order, and an invalid or skipped time yields none.
 */
export function startCandidates(
  destination: DestinationDraft,
): Temporal.ZonedDateTime[] {
  const { startsOn, startsAtTime, timeZone } = destination;
  if (!startsOn || !timeZone) return [];
  try {
    const date = Temporal.PlainDate.from(startsOn);
    if (!startsAtTime) {
      const start = date.toZonedDateTime(timeZone);
      return start.toPlainDate().equals(date) ? [start] : [];
    }
    const time = date.toPlainDateTime(startsAtTime);
    const earlier = time.toZonedDateTime(timeZone, {
      disambiguation: 'earlier',
    });
    const later = time.toZonedDateTime(timeZone, { disambiguation: 'later' });
    if (!earlier.toPlainDateTime().equals(time)) return [];
    return earlier.equals(later) ? [earlier] : [earlier, later];
  } catch {
    return [];
  }
}

/**
 * Converts a draft to a destination with a saved start in epoch milliseconds.
 * Returns undefined if the start is invalid or a repeated time needs an offset.
 */
export function resolveDestination(
  destination: DestinationDraft,
  candidates = startCandidates(destination),
): TripDestination | undefined {
  const start =
    candidates.length === 1
      ? candidates[0]
      : candidates.find(
          (candidate) => candidate.offset === destination.startOffset,
        );
  if (start) {
    return {
      ...destination,
      startOffset: candidates.length > 1 ? start.offset : null,
      startsAtMs: start.epochMilliseconds,
    };
  }
}

/**
 * Returns the first incomplete, out-of-range, or duplicate destination as a
 * form error, or undefined if all starts pass. Bounds are exclusive and use
 * epoch milliseconds.
 */
export function validateDestinations(
  destinations: TripDestination[],
  start?: number,
  end?: number,
): { id: string; message: string } | undefined {
  const seen = new Set<number>();
  for (const destination of destinations) {
    const name = destination.name.trim() || regionName(destination.region);
    if (
      !name ||
      !destination.region ||
      !destination.currency ||
      !destination.timeZone ||
      !destination.startsOn
    ) {
      return { id: destination.id, message: 'Complete each destination.' };
    }
    const ms = destination.startsAtMs;
    if (
      (start !== undefined && ms <= start) ||
      (end !== undefined && ms >= end)
    ) {
      return {
        id: destination.id,
        message: `${name} must start after the trip begins and before it ends.`,
      };
    }
    if (seen.has(ms))
      return {
        id: destination.id,
        message: `Choose a different start for ${name}.`,
      };
    seen.add(ms);
  }
}

/**
 * Prepares destination records for a trip copy by shifting their local dates
 * by the change in the trip's start date in the trip's time zone. Each shifted
 * start is resolved in its own destination zone. Returns undefined when there
 * are no added destinations. Throws on an invalid start.
 */
export function duplicateDestinations(
  trip: Pick<DestinationTrip, 'destinations' | 'timestampStart' | 'timeZone'>,
  start: number,
  end: number,
): TripDestination[] | undefined {
  if (!trip.destinations?.length) return undefined;

  const originalDate = Temporal.Instant.fromEpochMilliseconds(
    trip.timestampStart,
  )
    .toZonedDateTimeISO(trip.timeZone)
    .toPlainDate();
  const copyDate = Temporal.Instant.fromEpochMilliseconds(start)
    .toZonedDateTimeISO(trip.timeZone)
    .toPlainDate();
  const days = originalDate.until(copyDate).days;
  const destinations = days
    ? trip.destinations.map((destination) => {
        const shifted = resolveDestination({
          ...destination,
          startsOn: Temporal.PlainDate.from(destination.startsOn)
            .add({ days })
            .toString(),
        });
        if (!shifted) {
          throw new Error(
            `${destination.name} has an invalid or ambiguous start on the new dates.`,
          );
        }
        return shifted;
      })
    : trip.destinations;

  const issue = validateDestinations(destinations, start, end);
  if (issue) throw new Error(issue.message);

  return destinations;
}

type ResolvedDestination = Pick<
  TripDestination,
  'id' | 'name' | 'region' | 'currency' | 'timeZone'
> & { startsAtMs: number };

export type DestinationItinerary = readonly [
  ResolvedDestination,
  ...ResolvedDestination[],
];

/**
 * Builds the chronological itinerary for default selection. The trip's region,
 * currency, and time zone supply the first destination.
 */
export function itinerary(trip: DestinationTrip): DestinationItinerary {
  return [
    {
      id: 'first',
      name: regionName(trip.region),
      region: trip.region,
      currency: trip.currency,
      timeZone: trip.timeZone,
      startsAtMs: trip.timestampStart,
    },
    ...(trip.destinations ?? [])
      .toSorted((a, b) => a.startsAtMs - b.startsAtMs)
      .map(({ id, name, region, currency, timeZone, startsAtMs }) => ({
        id,
        name,
        region,
        currency,
        timeZone,
        startsAtMs,
      })),
  ];
}

/**
 * Finds the destination in effect at an instant. Uses the first destination
 * for instants before the trip begins.
 */
export function destinationAt(
  stops: DestinationItinerary,
  instant: Temporal.Instant,
): ResolvedDestination {
  const ms = instant.epochMilliseconds;
  return stops.findLast((stop) => stop.startsAtMs <= ms) ?? stops[0];
}

/**
 * Suggests destinations for a form based on exact place labels and timing.
 * A unique place match takes priority. A prefilled instant selects the active
 * destination if it fits the place. Otherwise, interpret the local time in each
 * candidate's zone. If none fit the time, return the candidates for the picker.
 */
export function destinationChoices(
  stops: DestinationItinerary,
  value?: Temporal.PlainDateTime,
  place?: string,
  prefilledInstant?: Temporal.Instant,
): readonly ResolvedDestination[] {
  const parts = new Set(
    place
      ?.toLowerCase()
      .split(/[,，]/)
      .map((part) => part.trim())
      .filter(Boolean),
  );
  const namedStops = stops.filter((stop) =>
    parts.has(stop.name.trim().toLowerCase()),
  );
  const placeMatches = namedStops.length
    ? namedStops
    : stops.filter((stop) => parts.has(regionName(stop.region).toLowerCase()));
  if (placeMatches.length === 1) return placeMatches;
  if (prefilledInstant) {
    const active = destinationAt(stops, prefilledInstant);
    if (!placeMatches.length || placeMatches.includes(active)) return [active];
  }
  if (!value) return placeMatches.length ? placeMatches : [stops[0]];

  const matchingPlaces = new Set(placeMatches);
  const matches = stops.filter((stop, index) => {
    if (matchingPlaces.size && !matchingPlaces.has(stop)) return false;
    const ms = value.toZonedDateTime(stop.timeZone).epochMilliseconds;
    const next = stops[index + 1];
    return (
      (index === 0 || ms >= stop.startsAtMs) && (!next || ms < next.startsAtMs)
    );
  });
  if (matches.length) return matches;
  return placeMatches.length ? placeMatches : stops;
}
