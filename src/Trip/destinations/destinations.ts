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
  startsAtMs?: number;
};

export type DestinationTrip = {
  timestampStart: number;
  region: string;
  currency: string;
  timeZone: string;
  destinations?: TripDestination[];
};

export const regionName = (region: string) =>
  REGIONS_LIST.find(([code]) => code === region)?.[1] ?? region;

export function startCandidates(destination: TripDestination) {
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

export function destinationStart(destination: TripDestination) {
  const candidates = startCandidates(destination);
  return (
    candidates.length === 1
      ? candidates[0]
      : candidates.find(
          (candidate) => candidate.offset === destination.startOffset,
        )
  )?.epochMilliseconds;
}

export function destinationError(
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
      return 'Complete each destination.';
    }
    const ms = destinationStart(destination);
    if (ms === undefined) return `${name} has an invalid or ambiguous start.`;
    if (
      (start !== undefined && ms <= start) ||
      (end !== undefined && ms >= end)
    ) {
      return `${name} must start after the trip begins and before it ends.`;
    }
    if (seen.has(ms)) return 'Choose a different start for each destination.';
    seen.add(ms);
  }
}

type ResolvedDestination = Pick<
  TripDestination,
  'id' | 'name' | 'region' | 'currency' | 'timeZone'
> & { startsAtMs: number };

export function itinerary(
  trip: DestinationTrip,
): [ResolvedDestination, ...ResolvedDestination[]] {
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
      .flatMap((destination) => {
        const startsAtMs =
          destination.startsAtMs ?? destinationStart(destination);
        return startsAtMs === undefined ? [] : [{ ...destination, startsAtMs }];
      })
      .sort((a, b) => a.startsAtMs - b.startsAtMs),
  ];
}

export function destinationAt(trip: DestinationTrip, instant: number) {
  const [first, ...stops] = itinerary(trip);
  return stops.findLast((stop) => stop.startsAtMs <= instant) ?? first;
}

export function destinationChoices(
  trip: DestinationTrip,
  value?: Temporal.PlainDateTime,
  place?: string,
) {
  const stops = itinerary(trip);
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
