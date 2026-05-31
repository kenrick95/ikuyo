import {
  Button,
  Flex,
  Heading,
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
              location: '',
              locationLat: undefined,
              locationLng: undefined,
              locationZoom: undefined,
              locationDestination: undefined,
              locationDestinationLat: undefined,
              locationDestinationLng: undefined,
              locationDestinationZoom: undefined,
              description: '',
              timestampStart: state.outboundFlight.departureDateTime.toMillis(),
              timestampEnd: state.outboundFlight.arrivalDateTime.toMillis(),
              timeZoneStart:
                state.outboundFlight.departureDateTime.zoneName ?? timeZone,
              timeZoneEnd:
                state.outboundFlight.arrivalDateTime.zoneName ?? timeZone,
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
              location: '',
              locationLat: undefined,
              locationLng: undefined,
              locationZoom: undefined,
              locationDestination: undefined,
              locationDestinationLat: undefined,
              locationDestinationLng: undefined,
              locationDestinationZoom: undefined,
              description: '',
              timestampStart: state.returnFlight.departureDateTime.toMillis(),
              timestampEnd: state.returnFlight.arrivalDateTime.toMillis(),
              timeZoneStart:
                state.returnFlight.departureDateTime.zoneName ?? timeZone,
              timeZoneEnd:
                state.returnFlight.arrivalDateTime.zoneName ?? timeZone,
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

  const step1Valid =
    state.title.trim() !== '' &&
    state.region !== '' &&
    state.startDate !== undefined &&
    state.endDate !== undefined;

  const step2Valid =
    state.timeZone !== '' &&
    state.currency !== '' &&
    state.originCurrency !== '';

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

      <div className={s.travelModeCards}>
        <button
          type="button"
          className={`${s.travelModeCard}${state.travelMode === 'flight' ? ` ${s.travelModeCardSelected}` : ''}`}
          onClick={() =>
            dispatch({
              type: 'SET_TRAVEL_MODE',
              travelMode: state.travelMode === 'flight' ? null : 'flight',
            })
          }
        >
          <span>✈️</span>
          <Text size="2" weight="medium">
            Flying
          </Text>
        </button>
        <button
          type="button"
          className={`${s.travelModeCard} ${s.travelModeCardDisabled}`}
          disabled
        >
          <span>🚌</span>
          <Text size="2" weight="medium">
            Other
          </Text>
          <Text size="1" color="gray">
            Coming soon
          </Text>
        </button>
      </div>

      {state.travelMode === 'flight' && (
        <>
          <FlightSubform
            label="Outbound flight"
            value={state.outboundFlight}
            originTimeZone={localTimeZone}
            destinationTimeZone={state.timeZone}
            isOutbound={true}
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
          <Button loading={isSubmitting} onClick={handleCreateTrip}>
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
  onChange: (flight: FlightCapture | null) => void;
};

function FlightSubform({
  label,
  value,
  originTimeZone,
  destinationTimeZone,
  isOutbound,
  onChange,
}: FlightSubformProps) {
  const emptyFlight: FlightCapture = {
    flightNumber: '',
    departureDateTime: undefined,
    arrivalDateTime: undefined,
  };
  const current = value ?? emptyFlight;
  const departureTimeZone = isOutbound ? originTimeZone : destinationTimeZone;
  const arrivalTimeZone = isOutbound ? destinationTimeZone : originTimeZone;

  return (
    <div className={s.flightSubform}>
      <Flex justify="between" align="center" mb="2">
        <Text size="2" weight="medium">
          {label}
        </Text>
        {value !== null && (
          <Button variant="ghost" size="1" onClick={() => onChange(null)}>
            Skip this flight
          </Button>
        )}
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
          <Text size="2">Departure ({departureTimeZone})</Text>
          <DateTimePicker
            value={current.departureDateTime}
            onChange={(date) =>
              onChange({ ...current, departureDateTime: date })
            }
            mode={DateTimePickerMode.DateTime}
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2">Arrival ({arrivalTimeZone})</Text>
          <DateTimePicker
            value={current.arrivalDateTime}
            onChange={(date) => onChange({ ...current, arrivalDateTime: date })}
            mode={DateTimePickerMode.DateTime}
          />
        </Flex>
      </Flex>
    </div>
  );
}
