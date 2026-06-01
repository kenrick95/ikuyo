import type { DateTime } from 'luxon';
import { getDefaultCurrencyForRegion } from '../../data/intl/currencies';
import type { FlightCapture } from './wizardReducer';

export function getFlightTimeError(
  flight: FlightCapture | null,
  tripStartDate: DateTime | undefined,
  tripEndDate: DateTime | undefined,
): string | undefined {
  if (!flight?.departureDateTime && !flight?.arrivalDateTime) return undefined;
  const dep = flight.departureDateTime?.setZone(flight.departureTimeZone, {
    keepLocalTime: true,
  });
  const arr = flight.arrivalDateTime?.setZone(flight.arrivalTimeZone, {
    keepLocalTime: true,
  });
  if (dep && arr && arr <= dep) return 'Arrival must be after departure';
  const minBound = tripStartDate?.minus({ days: 1 });
  const maxBound = tripEndDate?.plus({ days: 1 });
  if (dep && minBound && dep < minBound)
    return 'Departure cannot be more than 1 day before trip start';
  if (arr && maxBound && arr > maxBound)
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
