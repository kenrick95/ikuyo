import {
  Button,
  Flex,
  Heading,
  RadioCards,
  Select,
  Text,
  TextField,
} from '@radix-ui/themes';

import { useCallback, useMemo, useReducer, useState } from 'react';
import { useLocation } from 'wouter';
import { ActivityFlag } from '../../Activity/activityFlag';
import { dbAddActivity } from '../../Activity/db';
import { CurrencySelect } from '../../common/CurrencySelect/CurrencySelect';
import { DateTimePicker } from '../../common/DatePicker2/DateTimePicker';
import { DateTimePickerMode } from '../../common/DatePicker2/DateTimePickerMode';
import { toFormat } from '../../common/dateTime/temporalFormatter';
import { TimeZoneSelect } from '../../common/TimeZoneSelect/TimeZoneSelect';
import { REGIONS_LIST } from '../../data/intl/regions';
import { useBoundStore } from '../../data/store';
import { RouteTrip, RouteTrips } from '../../Routes/routes';
import { dbAddTrip } from '../db';
import { TripSharingLevel } from '../tripSharingLevel';
import { FlightSubform } from './FlightSubform';
import s from './PageTripNew.module.css';
import { TrainSubform } from './TrainSubform';
import { WizardProgressDots } from './WizardProgressDots';
import {
  createInitialWizardState,
  type FlightCapture,
  type TrainCapture,
  wizardReducer,
} from './wizardReducer';
import {
  getFlightTimeError,
  getOriginCurrencyFromLocale,
  getTrainTimeError,
} from './wizardUtils';

export default function PageTripNew() {
  const [, setLocation] = useLocation();
  const localTimeZone = Temporal.Now.timeZoneId();

  const [state, dispatch] = useReducer(wizardReducer, undefined, () =>
    createInitialWizardState(localTimeZone, getOriginCurrencyFromLocale()),
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const publishToast = useBoundStore((store) => store.publishToast);
  const currentUser = useBoundStore((store) => store.currentUser);

  const handleRegionChange = useCallback((region: string) => {
    dispatch({
      type: 'SET_REGION',
      region,
    });
  }, []);

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
    },
    [],
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
    },
    [],
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
      const activityPromises: Promise<unknown>[] = [];
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

        activityPromises.push(
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
        activityPromises.push(
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
      if (
        state.travelMode === 'train' &&
        state.outboundTrain?.trainNumber &&
        state.outboundTrain?.departureDateTime &&
        state.outboundTrain?.arrivalDateTime
      ) {
        const timestampStart = state.outboundTrain.departureDateTime
          .toZonedDateTime(state.outboundTrain.departureTimeZone || timeZone)
          .toInstant().epochMilliseconds;
        const timestampEnd = state.outboundTrain.arrivalDateTime
          .toZonedDateTime(state.outboundTrain.arrivalTimeZone || timeZone)
          .toInstant().epochMilliseconds;

        activityPromises.push(
          dbAddActivity(
            {
              title: state.outboundTrain.trainNumber,
              location: state.outboundTrain.departureStation || '',
              locationLat: state.outboundTrain.departureLat,
              locationLng: state.outboundTrain.departureLng,
              locationZoom: state.outboundTrain.departureZoom,
              locationDestination: state.outboundTrain.arrivalStation,
              locationDestinationLat: state.outboundTrain.arrivalLat,
              locationDestinationLng: state.outboundTrain.arrivalLng,
              locationDestinationZoom: state.outboundTrain.arrivalZoom,
              description: '',
              timestampStart,
              timestampEnd,
              timeZoneStart: state.outboundTrain.departureTimeZone,
              timeZoneEnd: state.outboundTrain.arrivalTimeZone,
              flags: ActivityFlag.IsTrain,
              icon: '🚆',
            },
            { tripId: newTripId },
          ),
        );
      }
      if (
        state.travelMode === 'train' &&
        state.returnTrain?.trainNumber &&
        state.returnTrain?.departureDateTime &&
        state.returnTrain?.arrivalDateTime
      ) {
        const timestampStart = state.returnTrain.departureDateTime
          .toZonedDateTime(state.returnTrain.departureTimeZone || timeZone)
          .toInstant().epochMilliseconds;
        const timestampEnd = state.returnTrain.arrivalDateTime
          .toZonedDateTime(state.returnTrain.arrivalTimeZone || timeZone)
          .toInstant().epochMilliseconds;
        activityPromises.push(
          dbAddActivity(
            {
              title: state.returnTrain.trainNumber,
              location: state.returnTrain.departureStation || '',
              locationLat: state.returnTrain.departureLat,
              locationLng: state.returnTrain.departureLng,
              locationZoom: state.returnTrain.departureZoom,
              locationDestination: state.returnTrain.arrivalStation,
              locationDestinationLat: state.returnTrain.arrivalLat,
              locationDestinationLng: state.returnTrain.arrivalLng,
              locationDestinationZoom: state.returnTrain.arrivalZoom,
              description: '',
              timestampStart,
              timestampEnd,
              timeZoneStart: state.returnTrain.departureTimeZone,
              timeZoneEnd: state.returnTrain.arrivalTimeZone,
              flags: ActivityFlag.IsTrain,
              icon: '🚆',
            },
            { tripId: newTripId },
          ),
        );
      }
      try {
        await Promise.all(activityPromises);
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
              'Trip created, but we could not add your transport details. You can add them later.',
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
  const outboundTrainError = getTrainTimeError(
    state.outboundTrain,
    state.startDate,
    state.endDate,
    state.timeZone,
  );
  const returnTrainError = getTrainTimeError(
    state.returnTrain,
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
  const handleOutboundTrainChange = useCallback(
    (trainCapture: TrainCapture | null) => {
      const train = trainCapture;
      // If user has set departure date, but has not set arrival date, set arrival date to same as departure date
      if (train?.departureDateTime && !train.arrivalDateTime) {
        train.arrivalDateTime = train.departureDateTime.add({ hours: 2 });
      }
      dispatch({ type: 'SET_OUTBOUND_TRAIN', train });
    },
    [],
  );
  const handleReturnTrainChange = useCallback((train: TrainCapture | null) => {
    // If user has set departure date, but has not set arrival date, set arrival date to same as departure date
    if (train?.departureDateTime && !train.arrivalDateTime) {
      train.arrivalDateTime = train.departureDateTime.add({ hours: 2 });
    }
    dispatch({ type: 'SET_RETURN_TRAIN', train });
  }, []);

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

  return (
    <div className={s.page}>
      <WizardProgressDots step={3} />
      <Heading size="5" mb="4">
        How are you getting there?
      </Heading>

      <RadioCards.Root
        columns="3"
        value={state.travelMode ?? ''}
        onValueChange={(v) =>
          dispatch({
            type: 'SET_TRAVEL_MODE',
            travelMode: v as 'flight' | 'train' | 'other',
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
        <RadioCards.Item value="train">
          <Flex direction="column" align="center" gap="1" width="100%">
            <span>🚆</span>
            <Text size="2" weight="medium">
              Train
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

      {state.travelMode === 'train' && (
        <>
          <TrainSubform
            label="Outbound train"
            value={state.outboundTrain}
            originTimeZone={localTimeZone}
            destinationTimeZone={state.timeZone}
            isOutbound={true}
            error={outboundTrainError}
            tripStartDate={state.startDate}
            tripEndDate={state.endDate}
            onChange={handleOutboundTrainChange}
          />
          <TrainSubform
            label="Return train"
            value={state.returnTrain}
            originTimeZone={localTimeZone}
            destinationTimeZone={state.timeZone}
            isOutbound={false}
            error={returnTrainError}
            tripStartDate={state.startDate}
            tripEndDate={state.endDate}
            onChange={handleReturnTrainChange}
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
        {state.travelMode === null ? (
          <Flex gap="2">
            <Button
              variant="ghost"
              loading={isSubmitting}
              onClick={handleCreateTrip}
            >
              Skip — I'll add transport later
            </Button>
            <Button loading={isSubmitting} onClick={handleCreateTrip}>
              Create Trip
            </Button>
          </Flex>
        ) : (
          <Button
            loading={isSubmitting}
            disabled={
              (state.travelMode === 'flight' &&
                (outboundFlightError !== undefined ||
                  returnFlightError !== undefined)) ||
              (state.travelMode === 'train' &&
                (outboundTrainError !== undefined ||
                  returnTrainError !== undefined))
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
