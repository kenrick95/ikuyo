import { getDefaultCurrencyForRegion } from '../../data/intl/currencies';
import type { FlightCapture } from './wizardReducer';

export function getFlightTimeError(
  flight: FlightCapture | null,
  tripStartDate: Temporal.PlainDate | undefined,
  tripEndDate: Temporal.PlainDate | undefined,
  tripTimeZone: string | undefined,
): string | undefined {
  if (!flight?.departureDateTime && !flight?.arrivalDateTime) return undefined;
  const dep = flight.departureDateTime?.toZonedDateTime(
    flight.departureTimeZone ?? tripTimeZone ?? Temporal.Now.timeZoneId(),
  );
  const arr = flight.arrivalDateTime?.toZonedDateTime(
    flight.arrivalTimeZone ?? tripTimeZone ?? Temporal.Now.timeZoneId(),
  );
  if (dep && arr && Temporal.ZonedDateTime.compare(arr, dep) <= 0)
    return 'Arrival must be after departure';

  const minBound = tripStartDate
    ?.subtract({ days: 1 })
    .toZonedDateTime(tripTimeZone ?? Temporal.Now.timeZoneId());
  const maxBound = tripEndDate
    ?.add({ days: 2 })
    .toZonedDateTime(tripTimeZone ?? Temporal.Now.timeZoneId());
  if (dep && minBound && Temporal.ZonedDateTime.compare(dep, minBound) < 0)
    return 'Departure cannot be more than 1 day before trip start';
  if (arr && maxBound && Temporal.ZonedDateTime.compare(arr, maxBound) > 0)
    return 'Arrival cannot be more than 1 day after trip end';
  return undefined;
}

export function getOriginCurrencyFromLocale(): string {
  try {
    const locale = new Intl.NumberFormat().resolvedOptions().locale;
    const region = new Intl.Locale(locale).region ?? '';
    return getDefaultCurrencyForRegion(region) ?? 'USD';
  } catch {
    return 'USD';
  }
}
