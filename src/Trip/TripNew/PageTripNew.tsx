import {
  Button,
  Flex,
  Heading,
  RadioCards,
  Select,
  Text,
  TextField,
} from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback, useMemo, useReducer, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { ActivityFlag } from '../../Activity/activityFlag';
import { dbAddActivity } from '../../Activity/db';
import { airportGeocodingRequest } from '../../Activity/FlightForm/FlightFormGeocoding';
import { CurrencySelect } from '../../common/CurrencySelect/CurrencySelect';
import { DateTimePicker } from '../../common/DatePicker2/DateTimePicker';
import { DateTimePickerMode } from '../../common/DatePicker2/DateTimePickerMode';
import { TimeZoneSelect } from '../../common/TimeZoneSelect/TimeZoneSelect';
import {
  ALL_CURRENCIES,
  getDefaultCurrencyForRegion,
} from '../../data/intl/currencies';
import { REGIONS_LIST } from '../../data/intl/regions';
import {
  ALL_TIMEZONES,
  getDefaultTimezoneForRegion,
} from '../../data/intl/timezones';
import { useBoundStore } from '../../data/store';
import { RouteTrip, RouteTrips } from '../../Routes/routes';
import { dbAddTrip } from '../db';
import { TripSharingLevel } from '../tripSharingLevel';
import s from './PageTripNew.module.css';
import {
  createInitialWizardState,
  type FlightCapture,
  wizardReducer,
} from './wizardReducer';

function getFlightTimeError(
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

function getOriginCurrencyFromLocale(): string {
  try {
    const locale = new Intl.NumberFormat().resolvedOptions().locale;
    const region = new Intl.Locale(locale).region ?? '';
    return getDefaultCurrencyForRegion(region) ?? 'USD';
  } catch {
    return 'USD';
  }
}

function ProgressDots({ step }: { step: 1 | 2 | 3 }) {
  return (
    <Flex direction="column" align="center" gap="2" mb="5">
      <Text size="1" color="gray">
        Step {step} of 3
      </Text>
      <div className={s.progressDots}>
        <div className={`${s.dot}${step >= 1 ? ` ${s.dotActive}` : ''}`} />
        <div className={`${s.dot}${step >= 2 ? ` ${s.dotActive}` : ''}`} />
        <div className={`${s.dot}${step >= 3 ? ` ${s.dotActive}` : ''}`} />
      </div>
    </Flex>
  );
}

export default function PageTripNew() {
  const [, setLocation] = useLocation();

  const [state, dispatch] = useReducer(wizardReducer, undefined, () =>
    createInitialWizardState(
      DateTime.local().zoneName ?? 'UTC',
      getOriginCurrencyFromLocale(),
    ),
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const publishToast = useBoundStore((store) => store.publishToast);
  const currentUser = useBoundStore((store) => store.currentUser);

  const handleRegionChange = useCallback(
    (region: string) => {
      const newTz = getDefaultTimezoneForRegion(region);
      const newCurrency = getDefaultCurrencyForRegion(region);
      dispatch({
        type: 'SET_REGION',
        region,
        timeZone:
          newTz && ALL_TIMEZONES.includes(newTz) ? newTz : state.timeZone,
        currency:
          newCurrency && ALL_CURRENCIES.includes(newCurrency)
            ? newCurrency
            : state.currency,
      });
    },
    [state.timeZone, state.currency],
  );

  const idRegion = 'wizard-region';

  const regionSelect = useMemo(
    () => (
      <Select.Root
        name="region"
        value={state.region}
        onValueChange={handleRegionChange}
        required
      >
        <Select.Trigger id={idRegion} placeholder="Select a region…" />
        <Select.Content>
          {REGIONS_LIST.map(([code, name]) => (
            <Select.Item key={code} value={code}>
              {name}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    ),
    [state.region, handleRegionChange],
  );

  const handleCreateTrip = useCallback(async () => {
    const {
      startDate,
      endDate,
      title,
      region,
      currency,
      originCurrency,
      timeZone,
    } = state;
    if (
      !startDate ||
      !endDate ||
      !title ||
      !region ||
      !currency ||
      !originCurrency ||
      !timeZone ||
      !currentUser
    ) {
      return;
    }
    setIsSubmitting(true);
    try {
      const { id: newTripId } = await dbAddTrip(
        {
          title,
          timeZone,
          timestampStart: startDate.toMillis(),
          timestampEnd: endDate.plus({ days: 1 }).toMillis(),
          region,
          currency,
          originCurrency,
          sharingLevel: TripSharingLevel.Private,
        },
        { userId: currentUser.id },
      );
      const flightPromises: Promise<unknown>[] = [];
      if (
        state.outboundFlight?.flightNumber &&
        state.outboundFlight?.departureDateTime &&
        state.outboundFlight?.arrivalDateTime
      ) {
        flightPromises.push(
          dbAddActivity(
            {
              title: state.outboundFlight.flightNumber,
              location: state.outboundFlight.departureAirport,
              locationLat: state.outboundFlight.departureLat,
              locationLng: state.outboundFlight.departureLng,
              locationZoom: state.outboundFlight.departureZoom,
              locationDestination: state.outboundFlight.arrivalAirport,
              locationDestinationLat: state.outboundFlight.arrivalLat,
              locationDestinationLng: state.outboundFlight.arrivalLng,
              locationDestinationZoom: state.outboundFlight.arrivalZoom,
              description: '',
              timestampStart: state.outboundFlight.departureDateTime
                .setZone(state.outboundFlight.departureTimeZone, {
                  keepLocalTime: true,
                })
                .toMillis(),
              timestampEnd: state.outboundFlight.arrivalDateTime
                .setZone(state.outboundFlight.arrivalTimeZone, {
                  keepLocalTime: true,
                })
                .toMillis(),
              timeZoneStart: state.outboundFlight.departureTimeZone,
              timeZoneEnd: state.outboundFlight.arrivalTimeZone,
              flags: ActivityFlag.IsFlight,
              icon: '✈️',
            },
            { tripId: newTripId },
          ),
        );
      }
      if (
        state.returnFlight?.flightNumber &&
        state.returnFlight?.departureDateTime &&
        state.returnFlight?.arrivalDateTime
      ) {
        flightPromises.push(
          dbAddActivity(
            {
              title: state.returnFlight.flightNumber,
              location: state.returnFlight.departureAirport,
              locationLat: state.returnFlight.departureLat,
              locationLng: state.returnFlight.departureLng,
              locationZoom: state.returnFlight.departureZoom,
              locationDestination: state.returnFlight.arrivalAirport,
              locationDestinationLat: state.returnFlight.arrivalLat,
              locationDestinationLng: state.returnFlight.arrivalLng,
              locationDestinationZoom: state.returnFlight.arrivalZoom,
              description: '',
              timestampStart: state.returnFlight.departureDateTime
                .setZone(state.returnFlight.departureTimeZone, {
                  keepLocalTime: true,
                })
                .toMillis(),
              timestampEnd: state.returnFlight.arrivalDateTime
                .setZone(state.returnFlight.arrivalTimeZone, {
                  keepLocalTime: true,
                })
                .toMillis(),
              timeZoneStart: state.returnFlight.departureTimeZone,
              timeZoneEnd: state.returnFlight.arrivalTimeZone,
              flags: ActivityFlag.IsFlight,
              icon: '✈️',
            },
            { tripId: newTripId },
          ),
        );
      }
      await Promise.all(flightPromises);
      publishToast({
        root: {},
        title: { children: 'Trip created!' },
        close: {},
      });
      setLocation(RouteTrip.asRouteTarget(newTripId));
    } catch {
      publishToast({
        root: {},
        title: { children: 'Failed to create trip. Please try again.' },
        close: {},
      });
      setIsSubmitting(false);
    }
  }, [state, currentUser, publishToast, setLocation]);

  const dateError =
    state.startDate !== undefined &&
    state.endDate !== undefined &&
    state.endDate < state.startDate
      ? 'End date must be on or after the start date'
      : undefined;

  const step1Valid =
    state.title.trim() !== '' &&
    state.region !== '' &&
    state.startDate !== undefined &&
    state.endDate !== undefined &&
    dateError === undefined;

  const step2Valid =
    state.timeZone !== '' &&
    state.currency !== '' &&
    state.originCurrency !== '';

  const outboundFlightError = getFlightTimeError(
    state.outboundFlight,
    state.startDate,
    state.endDate,
  );
  const returnFlightError = getFlightTimeError(
    state.returnFlight,
    state.startDate,
    state.endDate,
  );

  const regionDisplayName = useMemo(() => {
    if (!state.region) return '';
    const entry = REGIONS_LIST.find(([code]) => code === state.region);
    return entry ? entry[1] : state.region;
  }, [state.region]);

  const dateRangeLabel = useMemo(() => {
    if (!state.startDate || !state.endDate) return '';
    return `${state.startDate.toFormat('MMM d, yyyy')} – ${state.endDate.toFormat('MMM d, yyyy')}`;
  }, [state.startDate, state.endDate]);

  if (state.step === 1) {
    return (
      <div className={s.page}>
        <ProgressDots step={1} />
        <Heading size="5" mb="4">
          Plan a new trip
        </Heading>

        <Flex direction="column" gap="3">
          <Flex direction="column" gap="1">
            <Text as="label" htmlFor="wizard-title" size="2" weight="medium">
              Trip name
            </Text>
            <TextField.Root
              id="wizard-title"
              name="title"
              value={state.title}
              onChange={(e) =>
                dispatch({ type: 'SET_TITLE', title: e.target.value })
              }
              placeholder="e.g. Tokyo Spring 2026"
              autoFocus
              required
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text as="label" htmlFor={idRegion} size="2" weight="medium">
              Region / Country
            </Text>
            {regionSelect}
          </Flex>

          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium">
              Start date
            </Text>
            <DateTimePicker
              value={state.startDate}
              onChange={(date) => dispatch({ type: 'SET_START_DATE', date })}
              mode={DateTimePickerMode.Date}
              name="startDate"
              required
              placeholder="Pick a start date"
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium">
              End date
            </Text>
            <DateTimePicker
              value={state.endDate}
              onChange={(date) => dispatch({ type: 'SET_END_DATE', date })}
              mode={DateTimePickerMode.Date}
              name="endDate"
              required
              placeholder="Pick an end date"
              min={state.startDate}
            />
            {dateError !== undefined ? (
              <Text size="1" color="red">
                {dateError}
              </Text>
            ) : null}
          </Flex>
        </Flex>

        <Flex justify="between" mt="5">
          <Button
            variant="ghost"
            color="gray"
            onClick={() => setLocation(RouteTrips.asRouteTarget())}
          >
            ← Back to trips
          </Button>
          <Button
            disabled={!step1Valid}
            onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}
          >
            Next →
          </Button>
        </Flex>
      </div>
    );
  }

  if (state.step === 2) {
    return (
      <div className={s.page}>
        <ProgressDots step={2} />
        <Heading size="5" mb="4">
          Trip details
        </Heading>

        <div className={s.summaryCard}>
          <Text size="2" weight="bold">
            {state.title}
          </Text>
          {regionDisplayName ? (
            <Text as="p" size="2" color="gray">
              {regionDisplayName}
            </Text>
          ) : null}
          {dateRangeLabel ? (
            <Text as="p" size="2" color="gray">
              {dateRangeLabel}
            </Text>
          ) : null}
        </div>

        <Flex direction="column" gap="3">
          <Flex direction="column" gap="1">
            <Text as="label" htmlFor="wizard-timezone" size="2" weight="medium">
              Time zone
            </Text>
            <TimeZoneSelect
              name="timeZone"
              id="wizard-timezone"
              value={state.timeZone}
              isFormLoading={false}
              handleChange={(tz) =>
                dispatch({ type: 'SET_TIMEZONE', timeZone: tz })
              }
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text as="label" htmlFor="wizard-currency" size="2" weight="medium">
              Destination currency
            </Text>
            <CurrencySelect
              name="currency"
              id="wizard-currency"
              value={state.currency}
              isFormLoading={false}
              handleChange={(c) =>
                dispatch({ type: 'SET_CURRENCY', currency: c })
              }
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text
              as="label"
              htmlFor="wizard-originCurrency"
              size="2"
              weight="medium"
            >
              Origin currency
            </Text>
            <CurrencySelect
              name="originCurrency"
              id="wizard-originCurrency"
              value={state.originCurrency}
              isFormLoading={false}
              handleChange={(c) =>
                dispatch({ type: 'SET_ORIGIN_CURRENCY', originCurrency: c })
              }
            />
          </Flex>
        </Flex>

        <Flex justify="between" mt="5">
          <Button
            variant="ghost"
            color="gray"
            onClick={() => dispatch({ type: 'SET_STEP', step: 1 })}
          >
            ← Back
          </Button>
          <Button
            disabled={!step2Valid}
            onClick={() => dispatch({ type: 'SET_STEP', step: 3 })}
          >
            Next →
          </Button>
        </Flex>
      </div>
    );
  }

  const localTimeZone = DateTime.local().zoneName ?? 'UTC';

  return (
    <div className={s.page}>
      <ProgressDots step={3} />
      <Heading size="5" mb="4">
        How are you getting there?
      </Heading>

      <RadioCards.Root
        columns="2"
        value={state.travelMode ?? ''}
        onValueChange={(v) =>
          dispatch({
            type: 'SET_TRAVEL_MODE',
            travelMode: v as 'flight' | 'other',
          })
        }
        mt="2"
      >
        <RadioCards.Item value="flight" autoFocus>
          <Flex direction="column" align="center" gap="1" width="100%">
            <span>✈️</span>
            <Text size="2" weight="medium">
              Flying
            </Text>
          </Flex>
        </RadioCards.Item>
        <RadioCards.Item value="other" disabled>
          <Flex direction="column" align="center" gap="1" width="100%">
            <span>🚌</span>
            <Text size="2" weight="medium">
              Other
            </Text>
            <Text size="1" color="gray">
              Coming soon
            </Text>
          </Flex>
        </RadioCards.Item>
      </RadioCards.Root>

      {state.travelMode === 'flight' && (
        <>
          <FlightSubform
            label="Outbound flight"
            value={state.outboundFlight}
            originTimeZone={localTimeZone}
            destinationTimeZone={state.timeZone}
            isOutbound={true}
            error={outboundFlightError}
            tripStartDate={state.startDate}
            tripEndDate={state.endDate}
            onChange={(flight) =>
              dispatch({ type: 'SET_OUTBOUND_FLIGHT', flight })
            }
          />
          <FlightSubform
            label="Return flight"
            value={state.returnFlight}
            originTimeZone={localTimeZone}
            destinationTimeZone={state.timeZone}
            isOutbound={false}
            error={returnFlightError}
            tripStartDate={state.startDate}
            tripEndDate={state.endDate}
            onChange={(flight) =>
              dispatch({ type: 'SET_RETURN_FLIGHT', flight })
            }
          />
        </>
      )}

      <Flex justify="between" mt="5">
        <Button
          variant="ghost"
          color="gray"
          onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}
        >
          ← Back
        </Button>
        {state.travelMode !== 'flight' ? (
          <Flex gap="2">
            <Button
              variant="ghost"
              loading={isSubmitting}
              onClick={handleCreateTrip}
            >
              Skip — I'll add flights later
            </Button>
            <Button loading={isSubmitting} onClick={handleCreateTrip}>
              Create Trip
            </Button>
          </Flex>
        ) : (
          <Button
            loading={isSubmitting}
            disabled={
              outboundFlightError !== undefined ||
              returnFlightError !== undefined
            }
            onClick={handleCreateTrip}
          >
            Create Trip
          </Button>
        )}
      </Flex>
    </div>
  );
}

type FlightSubformProps = {
  label: string;
  value: FlightCapture | null;
  originTimeZone: string;
  destinationTimeZone: string;
  isOutbound: boolean;
  error?: string;
  tripStartDate: DateTime | undefined;
  tripEndDate: DateTime | undefined;
  onChange: (flight: FlightCapture | null) => void;
};

function FlightSubform({
  label,
  value,
  originTimeZone,
  destinationTimeZone,
  isOutbound,
  error,
  tripStartDate,
  tripEndDate,
  onChange,
}: FlightSubformProps) {
  const defaultDepartureTz = isOutbound ? originTimeZone : destinationTimeZone;
  const defaultArrivalTz = isOutbound ? destinationTimeZone : originTimeZone;
  const emptyFlight: FlightCapture = {
    flightNumber: '',
    departureAirport: '',
    arrivalAirport: '',
    departureDateTime: undefined,
    arrivalDateTime: undefined,
    departureTimeZone: defaultDepartureTz,
    arrivalTimeZone: defaultArrivalTz,
    departureLat: undefined,
    departureLng: undefined,
    departureZoom: undefined,
    arrivalLat: undefined,
    arrivalLng: undefined,
    arrivalZoom: undefined,
  };
  const current = value ?? emptyFlight;
  const [editingDepartureTz, setEditingDepartureTz] = useState(false);
  const [editingArrivalTz, setEditingArrivalTz] = useState(false);
  const departureBadgeRef = useRef<HTMLButtonElement>(null);
  const arrivalBadgeRef = useRef<HTMLButtonElement>(null);

  return (
    <div className={s.flightSubform}>
      <Flex justify="between" align="center" mb="2">
        <Text size="2" weight="medium">
          {label}
        </Text>
        <Text size="1" color="gray">
          optional
        </Text>
      </Flex>

      <Flex direction="column" gap="2">
        <Flex direction="column" gap="1">
          <Text size="2">Flight number</Text>
          <TextField.Root
            placeholder="e.g. SQ321"
            value={current.flightNumber}
            onChange={(e) =>
              onChange({ ...current, flightNumber: e.target.value })
            }
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2">Departure airport</Text>
          <TextField.Root
            placeholder="e.g. SYD or Sydney Airport"
            value={current.departureAirport}
            onChange={(e) =>
              onChange({
                ...current,
                departureAirport: e.target.value,
                departureLat: undefined,
                departureLng: undefined,
                departureZoom: undefined,
              })
            }
            onBlur={async (e) => {
              const query = e.target.value.trim();
              if (!query) return;
              const [lng, lat, zoom] = await airportGeocodingRequest(query);
              onChange({
                ...current,
                departureAirport: query,
                departureLat: lat,
                departureLng: lng,
                departureZoom: zoom,
              });
            }}
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2">Arrival airport</Text>
          <TextField.Root
            placeholder="e.g. LHR or London Heathrow"
            value={current.arrivalAirport}
            onChange={(e) =>
              onChange({
                ...current,
                arrivalAirport: e.target.value,
                arrivalLat: undefined,
                arrivalLng: undefined,
                arrivalZoom: undefined,
              })
            }
            onBlur={async (e) => {
              const query = e.target.value.trim();
              if (!query) return;
              const [lng, lat, zoom] = await airportGeocodingRequest(query);
              onChange({
                ...current,
                arrivalAirport: query,
                arrivalLat: lat,
                arrivalLng: lng,
                arrivalZoom: zoom,
              });
            }}
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Flex justify="between" align="baseline">
            <Text size="2">Departure</Text>
            {editingDepartureTz ? (
              <Select.Root
                defaultOpen
                value={current.departureTimeZone}
                onValueChange={(tz) =>
                  onChange({ ...current, departureTimeZone: tz })
                }
                onOpenChange={(open) => {
                  if (!open) {
                    setEditingDepartureTz(false);
                    setTimeout(() => departureBadgeRef.current?.focus(), 0);
                  }
                }}
              >
                <Select.Trigger />
                <Select.Content>
                  {ALL_TIMEZONES.map((tz) => (
                    <Select.Item key={tz} value={tz}>
                      {tz}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            ) : (
              <button
                ref={departureBadgeRef}
                type="button"
                className={s.tzBadge}
                onClick={() => setEditingDepartureTz(true)}
              >
                {current.departureTimeZone}
              </button>
            )}
          </Flex>
          <DateTimePicker
            value={current.departureDateTime}
            onChange={(date) =>
              onChange({ ...current, departureDateTime: date })
            }
            mode={DateTimePickerMode.DateTime}
            placeholder="Pick date & time"
            min={tripStartDate?.minus({ days: 1 })}
            max={tripEndDate?.plus({ days: 1 })}
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Flex justify="between" align="baseline">
            <Text size="2">Arrival</Text>
            {editingArrivalTz ? (
              <Select.Root
                defaultOpen
                value={current.arrivalTimeZone}
                onValueChange={(tz) =>
                  onChange({ ...current, arrivalTimeZone: tz })
                }
                onOpenChange={(open) => {
                  if (!open) {
                    setEditingArrivalTz(false);
                    setTimeout(() => arrivalBadgeRef.current?.focus(), 0);
                  }
                }}
              >
                <Select.Trigger />
                <Select.Content>
                  {ALL_TIMEZONES.map((tz) => (
                    <Select.Item key={tz} value={tz}>
                      {tz}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            ) : (
              <button
                ref={arrivalBadgeRef}
                type="button"
                className={s.tzBadge}
                onClick={() => setEditingArrivalTz(true)}
              >
                {current.arrivalTimeZone}
              </button>
            )}
          </Flex>
          <DateTimePicker
            value={current.arrivalDateTime}
            onChange={(date) => onChange({ ...current, arrivalDateTime: date })}
            mode={DateTimePickerMode.DateTime}
            placeholder="Pick date & time"
            min={tripStartDate?.minus({ days: 1 })}
            max={tripEndDate?.plus({ days: 1 })}
          />
          {error !== undefined && (
            <Text size="1" color="red">
              {error}
            </Text>
          )}
        </Flex>
      </Flex>
    </div>
  );
}
