import { REGIONS_LIST } from '../../data/intl/regions';

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

export const regionName = (region: string) =>
  REGIONS_LIST.find(([code]) => code === region)?.[1] ?? region;

export function startCandidates(destination: DestinationDraft) {
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

export function validateDestinations(
  destinations: TripDestination[],
  start?: number,
  end?: number,
) {
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

export function duplicateDestinations(
  trip: Pick<DestinationTrip, 'destinations' | 'timestampStart' | 'timeZone'>,
  start: number,
  end: number,
) {
  if (!trip.destinations?.length) return undefined;

  const localDate = (ms: number) =>
    Temporal.Instant.fromEpochMilliseconds(ms)
      .toZonedDateTimeISO(trip.timeZone)
      .toPlainDate();
  const days = localDate(trip.timestampStart).until(localDate(start)).days;
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

export function destinationAt(stops: DestinationItinerary, instant: number) {
  return stops.findLast((stop) => stop.startsAtMs <= instant) ?? stops[0];
}

export function destinationChoices(
  stops: DestinationItinerary,
  value?: Temporal.PlainDateTime,
  place?: string,
) {
  const normalized = place?.trim().toLocaleLowerCase();
  const parts = normalized?.split(/[,，]/).map((part) => part.trim()) ?? [];
  const matchesName = (name: string | undefined) => {
    const word = name?.trim().toLocaleLowerCase();
    return word
      ? parts.some((part) => part === word || part.startsWith(`${word} `))
      : false;
  };
  const placeMatches = stops.filter(
    (stop) =>
      matchesName(stop.name) ||
      matchesName(stop.timeZone.split('/').at(-1)?.replaceAll('_', ' ')),
  );
  const names = placeMatches.length
    ? placeMatches
    : stops.filter((stop) => matchesName(regionName(stop.region)));
  if (names.length === 1) return names;
  if (!value) return names.length ? names : stops.slice(0, 1);
  const candidates = names.length ? names : stops;
  const matches = candidates.filter((stop) => {
    const instant = value.toZonedDateTime(stop.timeZone).epochMilliseconds;
    const index = stops.indexOf(stop);
    const next = stops[index + 1];
    return (
      (index === 0 || instant >= stop.startsAtMs) &&
      (!next || instant < next.startsAtMs)
    );
  });
  return matches.length
    ? matches
    : candidates.length > 1
      ? candidates
      : stops.slice(0, 1);
}
