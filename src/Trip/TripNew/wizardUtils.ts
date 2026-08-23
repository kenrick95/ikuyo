import { getDefaultCurrencyForRegion } from '../../data/intl/currencies';
import { useBoundStore } from '../../data/store';
import type { DbUser } from '../../User/db';
import { dbUpdateUserPreferences } from '../../User/db';
import type { FlightCapture, TrainCapture } from './wizardReducer';

type TransportCapture = Pick<
  FlightCapture | TrainCapture,
  | 'departureDateTime'
  | 'arrivalDateTime'
  | 'departureTimeZone'
  | 'arrivalTimeZone'
>;

export function getTransportTimeError(
  transport: TransportCapture | null,
  tripStartDate: Temporal.PlainDate | undefined,
  tripEndDate: Temporal.PlainDate | undefined,
  tripTimeZone: string | undefined,
): string | undefined {
  if (!transport?.departureDateTime && !transport?.arrivalDateTime)
    return undefined;
  const dep = transport.departureDateTime?.toZonedDateTime(
    transport.departureTimeZone ?? tripTimeZone ?? Temporal.Now.timeZoneId(),
  );
  const arr = transport.arrivalDateTime?.toZonedDateTime(
    transport.arrivalTimeZone ?? tripTimeZone ?? Temporal.Now.timeZoneId(),
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

export function getFlightTimeError(
  flight: FlightCapture | null,
  tripStartDate: Temporal.PlainDate | undefined,
  tripEndDate: Temporal.PlainDate | undefined,
  tripTimeZone: string | undefined,
): string | undefined {
  return getTransportTimeError(
    flight,
    tripStartDate,
    tripEndDate,
    tripTimeZone,
  );
}

export function getTrainTimeError(
  train: TrainCapture | null,
  tripStartDate: Temporal.PlainDate | undefined,
  tripEndDate: Temporal.PlainDate | undefined,
  tripTimeZone: string | undefined,
): string | undefined {
  return getTransportTimeError(train, tripStartDate, tripEndDate, tripTimeZone);
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

/**
 * Persist origin preferences to the user only for fields they haven't set yet.
 * Fire-and-forget; never throws to the caller.
 */
export async function saveOriginPreferences(
  currentUser: DbUser | undefined,
  region: string | undefined,
  currency: string | undefined,
  timeZone: string | undefined,
): Promise<void> {
  if (!currentUser?.id) return;
  const attrs: { region?: string; currency?: string; timeZone?: string } = {};
  if (region && !currentUser.preferredRegion) attrs.region = region;
  if (currency && !currentUser.preferredCurrency) attrs.currency = currency;
  if (timeZone && !currentUser.preferredTimeZone) attrs.timeZone = timeZone;
  if (Object.keys(attrs).length === 0) return;
  try {
    await dbUpdateUserPreferences({ id: currentUser.id, ...attrs });
    await useBoundStore.getState().refreshCurrentUser();
  } catch (e) {
    console.error('Failed to save origin preferences:', e);
  }
}
