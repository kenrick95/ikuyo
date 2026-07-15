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
import { useCallback, useMemo, useReducer, useState } from 'react';
import { useLocation } from 'wouter';
import { ActivityFlag } from '../../Activity/activityFlag';
import { dbAddActivity } from '../../Activity/db';
import { CurrencySelect } from '../../common/CurrencySelect/CurrencySelect';
import { DateTimePicker } from '../../common/DatePicker2/DateTimePicker';
import { DateTimePickerMode } from '../../common/DatePicker2/DateTimePickerMode';
import { toFormat } from '../../common/dateTime/temporalFormatter';
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
import { FlightSubform } from './FlightSubform';
import s from './PageTripNew.module.css';
import { WizardProgressDots } from './WizardProgressDots';
import {
  createInitialWizardState,
  type FlightCapture,
  wizardReducer,
} from './wizardReducer';
import { getFlightTimeError, getOriginCurrencyFromLocale } from './wizardUtils';

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

  const handleChangeStartDate = useCallback(
    (date: Temporal.PlainDate | Temporal.PlainDateTime | undefined) => {
      if (date instanceof Temporal.PlainDate) {
        dispatch({ type: 'SET_START_DATE', date });
      } else if (date instanceof Temporal.PlainDateTime) {
        dispatch({ type: 'SET_START_DATE', date: date.toPlainDate() });
      } else {
        dispatch({ type: 'SET_START_DATE', date: undefined });
      }

      // If the end date has not been set, set it to the same as the start date
      if (date instanceof Temporal.PlainDate && !state.endDate) {
        dispatch({ type: 'SET_END_DATE', date });
      }

      // If user has not set outbound flight departure date, set it to the start date
      if (
        date instanceof Temporal.PlainDate &&
        !state.outboundFlight?.departureDateTime
      ) {
        const newOutboundFlight = {
          departureDateTime: Temporal.PlainDateTime.from({
            year: date.year,
            month: date.month,
            day: date.day,
            hour: 12, // Default to noon
            minute: 0,
          }),
        };
        dispatch({ type: 'SET_OUTBOUND_FLIGHT', flight: newOutboundFlight });
      }

      // If user has not set outbound flight arrival date, set it to the start date
      if (
        date instanceof Temporal.PlainDate &&
        !state.outboundFlight?.arrivalDateTime
      ) {
        const newOutboundFlight = {
          arrivalDateTime: Temporal.PlainDateTime.from({
            year: date.year,
            month: date.month,
            day: date.day,
            hour: 13,
            minute: 0,
          }),
        };
        dispatch({ type: 'SET_OUTBOUND_FLIGHT', flight: newOutboundFlight });
      }
    },
    [
      state.endDate,
      state.outboundFlight?.arrivalDateTime,
      state.outboundFlight?.departureDateTime,
    ],
  );
  const handleChangeEndDate = useCallback(
    (date: Temporal.PlainDate | Temporal.PlainDateTime | undefined) => {
      if (date instanceof Temporal.PlainDate) {
        dispatch({ type: 'SET_END_DATE', date });
      } else if (date instanceof Temporal.PlainDateTime) {
        dispatch({ type: 'SET_END_DATE', date: date.toPlainDate() });
      } else {
        dispatch({ type: 'SET_END_DATE', date: undefined });
      }

      // If user has not set return flight departure date, set it to the start date
      if (
        date instanceof Temporal.PlainDate &&
        !state.returnFlight?.departureDateTime
      ) {
        const newReturnFlight = {
          departureDateTime: Temporal.PlainDateTime.from({
            year: date.year,
            month: date.month,
            day: date.day,
            hour: 12, // Default to noon
            minute: 0,
          }),
        };
        dispatch({ type: 'SET_RETURN_FLIGHT', flight: newReturnFlight });
      }

      // If user has not set return flight arrival date, set it to the start date
      if (
        date instanceof Temporal.PlainDate &&
        !state.returnFlight?.arrivalDateTime
      ) {
        const newReturnFlight = {
          arrivalDateTime: Temporal.PlainDateTime.from({
            year: date.year,
            month: date.month,
            day: date.day,
            hour: 13,
            minute: 0,
          }),
        };
        dispatch({ type: 'SET_RETURN_FLIGHT', flight: newReturnFlight });
      }
    },
    [
      state.returnFlight?.departureDateTime,
      state.returnFlight?.arrivalDateTime,
    ],
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
      const timestampStart = startDate
        .toZonedDateTime(timeZone)
        .toInstant().epochMilliseconds;
      const timestampEnd = endDate
        .add({ days: 1 })
        .toZonedDateTime(timeZone)
        .toInstant().epochMilliseconds;
      const { id: newTripId } = await dbAddTrip(
        {
          title,
          timeZone,
          timestampStart,
          timestampEnd,
          region,
          currency,
          originCurrency,
          sharingLevel: TripSharingLevel.Private,
        },
        { userId: currentUser.id },
      );
      const flightPromises: Promise<unknown>[] = [];
      if (
        state.travelMode === 'flight' &&
        state.outboundFlight?.flightNumber &&
        state.outboundFlight?.departureDateTime &&
        state.outboundFlight?.arrivalDateTime
      ) {
        const timestampStart = state.outboundFlight.departureDateTime
          .toZonedDateTime(state.outboundFlight.departureTimeZone || timeZone)
          .toInstant().epochMilliseconds;
        const timestampEnd = state.outboundFlight.arrivalDateTime
          .toZonedDateTime(state.outboundFlight.arrivalTimeZone || timeZone)
          .toInstant().epochMilliseconds;

        flightPromises.push(
          dbAddActivity(
            {
              title: state.outboundFlight.flightNumber,
              location: state.outboundFlight.departureAirport || '',
              locationLat: state.outboundFlight.departureLat,
              locationLng: state.outboundFlight.departureLng,
              locationZoom: state.outboundFlight.departureZoom,
              locationDestination: state.outboundFlight.arrivalAirport,
              locationDestinationLat: state.outboundFlight.arrivalLat,
              locationDestinationLng: state.outboundFlight.arrivalLng,
              locationDestinationZoom: state.outboundFlight.arrivalZoom,
              description: '',
              timestampStart,
              timestampEnd,
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
        state.travelMode === 'flight' &&
        state.returnFlight?.flightNumber &&
        state.returnFlight?.departureDateTime &&
        state.returnFlight?.arrivalDateTime
      ) {
        const timestampStart = state.returnFlight.departureDateTime
          .toZonedDateTime(state.returnFlight.departureTimeZone || timeZone)
          .toInstant().epochMilliseconds;
        const timestampEnd = state.returnFlight.arrivalDateTime
          .toZonedDateTime(state.returnFlight.arrivalTimeZone || timeZone)
          .toInstant().epochMilliseconds;
        flightPromises.push(
          dbAddActivity(
            {
              title: state.returnFlight.flightNumber,
              location: state.returnFlight.departureAirport || '',
              locationLat: state.returnFlight.departureLat,
              locationLng: state.returnFlight.departureLng,
              locationZoom: state.returnFlight.departureZoom,
              locationDestination: state.returnFlight.arrivalAirport,
              locationDestinationLat: state.returnFlight.arrivalLat,
              locationDestinationLng: state.returnFlight.arrivalLng,
              locationDestinationZoom: state.returnFlight.arrivalZoom,
              description: '',
              timestampStart,
              timestampEnd,
              timeZoneStart: state.returnFlight.departureTimeZone,
              timeZoneEnd: state.returnFlight.arrivalTimeZone,
              flags: ActivityFlag.IsFlight,
              icon: '✈️',
            },
            { tripId: newTripId },
          ),
        );
      }
      try {
        await Promise.all(flightPromises);
        publishToast({
          root: {},
          title: { children: 'Trip created!' },
          close: {},
        });
      } catch {
        publishToast({
          root: {},
          title: {
            children:
              'Trip created, but we could not add your flights. You can add them later.',
          },
          close: {},
        });
      }
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
    Temporal.PlainDate.compare(state.startDate, state.endDate) > 0
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
    state.timeZone,
  );
  const returnFlightError = getFlightTimeError(
    state.returnFlight,
    state.startDate,
    state.endDate,
    state.timeZone,
  );

  const regionDisplayName = useMemo(() => {
    if (!state.region) return '';
    const entry = REGIONS_LIST.find(([code]) => code === state.region);
    return entry ? entry[1] : state.region;
  }, [state.region]);

  const dateRangeLabel = useMemo(() => {
    if (!state.startDate || !state.endDate) return '';
    return `${toFormat('d MMM yyyy', state.startDate)} – ${toFormat('d MMM yyyy', state.endDate)}`;
  }, [state.startDate, state.endDate]);
  const handleOutboundFlightChange = useCallback(
    (flightCapture: FlightCapture | null) => {
      const flight = flightCapture;
      // If user has set departure date, but has not set arrival date, set arrival date to same as departure date
      if (flight?.departureDateTime && !flight.arrivalDateTime) {
        flight.arrivalDateTime = flight.departureDateTime.add({ hours: 2 });
      }
      dispatch({ type: 'SET_OUTBOUND_FLIGHT', flight });
    },
    [],
  );
  const handleReturnFlightChange = useCallback(
    (flight: FlightCapture | null) => {
      // If use has set departure date, but has not set arrival date, set arrival date to same as departure date
      if (flight?.departureDateTime && !flight.arrivalDateTime) {
        flight.arrivalDateTime = flight.departureDateTime.add({ hours: 2 });
      }
      dispatch({ type: 'SET_RETURN_FLIGHT', flight });
    },
    [],
  );

  if (state.step === 1) {
    return (
      <div className={s.page}>
        <WizardProgressDots step={1} />
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
              onChange={handleChangeStartDate}
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
              onChange={handleChangeEndDate}
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
        <WizardProgressDots step={2} />
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
      <WizardProgressDots step={3} />
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
            onChange={handleOutboundFlightChange}
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
            onChange={handleReturnFlightChange}
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
