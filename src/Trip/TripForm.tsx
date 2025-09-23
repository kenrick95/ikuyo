import { Button, Flex, Select, Text, TextField } from '@radix-ui/themes';
import type { DateTime } from 'luxon';
import { useCallback, useId, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { DateTimePicker } from '../common/DatePicker2/DateTimePicker';
import { DateTimePickerMode } from '../common/DatePicker2/DateTimePickerMode';
import { dangerToken } from '../common/ui';
import { getDefaultCurrencyForRegion } from '../data/intl/currencies';
import { REGIONS_LIST } from '../data/intl/regions';
import { getDefaultTimezoneForRegion } from '../data/intl/timezones';
import { useBoundStore } from '../data/store';
import { RouteTrip } from '../Routes/routes';
import { dbAddTrip, dbUpdateTrip } from './db';
import type { TripSliceActivity } from './store/types';
import { TripFormMode } from './TripFormMode';
import {
  TripSharingLevel,
  type TripSharingLevelType,
} from './tripSharingLevel';

export function TripForm({
  mode,
  tripId,
  tripStartDateTime,
  tripEndDateTime,
  tripTitle,
  tripTimeZone,
  tripRegion,
  tripCurrency,
  tripOriginCurrency,
  tripSharingLevel,
  userId,
  activities,
  onFormSuccess,
  onFormCancel,
}: {
  mode: TripFormMode;
  tripId?: string;
  tripStartDateTime: DateTime | undefined;
  tripEndDateTime: DateTime | undefined;
  tripTitle: string;
  tripTimeZone: string;
  tripRegion: string;
  tripCurrency: string;
  tripOriginCurrency: string;
  tripSharingLevel: TripSharingLevelType;
  userId?: string;
  activities?: TripSliceActivity[];
  onFormSuccess: () => void;
  onFormCancel: () => void;
}) {
  const [, setLocation] = useLocation();
  const idTitle = useId();
  const idTimeZone = useId();
  const idCurrency = useId();
  const idOriginCurrency = useId();
  const idRegion = useId();
  const publishToast = useBoundStore((state) => state.publishToast);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [currentTimeZone, setCurrentTimeZone] = useState(tripTimeZone);
  const [currentRegion, setCurrentRegion] = useState(tripRegion);
  const [currentCurrency, setCurrentCurrency] = useState(tripCurrency);
  const [currentStartDate, setCurrentStartDate] = useState<
    DateTime | undefined
  >(tripStartDateTime);
  const [currentEndDate, setCurrentEndDate] = useState<DateTime | undefined>(
    tripEndDateTime,
  );

  const [errorMessage, setErrorMessage] = useState('');
  const timeZones = useMemo(() => Intl.supportedValuesOf('timeZone'), []);
  const currencies = useMemo(() => Intl.supportedValuesOf('currency'), []);

  // Handler for start date changes
  const handleStartDateChange = useCallback(
    (dateTime: DateTime | undefined) => {
      setCurrentStartDate(dateTime);
    },
    [],
  );

  // Handler for end date changes
  const handleEndDateChange = useCallback((dateTime: DateTime | undefined) => {
    setCurrentEndDate(dateTime);
  }, []);

  // Helper to update timezone on DateTime objects
  const updateDateTimeZone = useCallback(
    (dateTime: DateTime | undefined, newTimeZone: string) => {
      if (!dateTime) return undefined;
      return dateTime.setZone(newTimeZone, {
        // "preserve" time relative to the date
        keepLocalTime: true,
      });
    },
    [],
  );

  // Handler for timezone change
  const handleTimeZoneChange = useCallback(
    (newTimeZone: string) => {
      setCurrentTimeZone(newTimeZone);
      // Update existing dates to new timezone
      setCurrentStartDate((prev) => updateDateTimeZone(prev, newTimeZone));
      setCurrentEndDate((prev) => updateDateTimeZone(prev, newTimeZone));
    },
    [updateDateTimeZone],
  );

  // Handler for region change to auto-populate timezone
  const handleRegionChange = useCallback(
    (newRegion: string) => {
      setCurrentRegion(newRegion);

      // Only auto-set timezone if it's not already set (for new trips) or if user hasn't manually changed it
      if (mode === TripFormMode.New || currentTimeZone === tripTimeZone) {
        const defaultTimezone = getDefaultTimezoneForRegion(newRegion);
        if (defaultTimezone && timeZones.includes(defaultTimezone)) {
          handleTimeZoneChange(defaultTimezone);
        }
      }
      if (mode === TripFormMode.New || currentCurrency === tripCurrency) {
        const defaultCurrency = getDefaultCurrencyForRegion(newRegion);
        if (defaultCurrency && currencies.includes(defaultCurrency)) {
          setCurrentCurrency(defaultCurrency);
        }
      }
    },
    [
      mode,
      currentTimeZone,
      tripTimeZone,
      timeZones,
      currentCurrency,
      tripCurrency,
      currencies,
      handleTimeZoneChange,
    ],
  );
  const handleForm = useCallback(() => {
    return async (elForm: HTMLFormElement) => {
      setErrorMessage('');
      if (!elForm.reportValidity()) {
        setIsFormLoading(false);
        return;
      }
      const formData = new FormData(elForm);
      const title = (formData.get('title') as string | null) ?? '';
      const dateStartDateTime = currentStartDate;
      const dateEndDateTime = currentEndDate?.plus({ day: 1 });
      const timeZone = currentTimeZone;
      const region = currentRegion;
      const currency = currentCurrency;
      const originCurrency =
        (formData.get('originCurrency') as string | null) ?? '';
      console.log('TripForm', {
        mode,
        location,
        tripId,
        title,
        timeZone,
        region,
        currency,
        originCurrency,
        dateStartDateTime,
        dateEndDateTime,
      });
      if (
        !title ||
        !dateStartDateTime ||
        !dateEndDateTime ||
        !timeZone ||
        !currency ||
        !originCurrency ||
        !region
      ) {
        setIsFormLoading(false);
        return;
      }
      if (dateEndDateTime.diff(dateStartDateTime).as('minute') < 0) {
        setErrorMessage('End date must be after start date');
        setIsFormLoading(false);
        return;
      }
      if (mode === TripFormMode.Edit && tripId) {
        await dbUpdateTrip(
          {
            id: tripId,
            title,
            timeZone,
            timestampStart: dateStartDateTime.toMillis(),
            timestampEnd: dateEndDateTime.toMillis(),
            region,
            currency,
            originCurrency,
            sharingLevel: tripSharingLevel,
          },
          {
            activities,
            previousTimeZone: tripTimeZone,
          },
        );
        publishToast({
          root: {},
          title: { children: `Trip ${title} edited` },
          close: {},
        });
        elForm.reset();
        setIsFormLoading(false);
        onFormSuccess();
      } else if (mode === TripFormMode.New && userId) {
        const { id: newId, result } = await dbAddTrip(
          {
            title,
            timeZone,
            timestampStart: dateStartDateTime.toMillis(),
            timestampEnd: dateEndDateTime.toMillis(),
            region,
            currency,
            originCurrency,
            sharingLevel: TripSharingLevel.Private,
          },
          {
            userId,
          },
        );
        console.log('!dbAddTrip', newId, result);

        publishToast({
          root: {},
          title: { children: `Trip ${title} added` },
          close: {},
        });
        elForm.reset();
        setIsFormLoading(false);
        onFormSuccess();

        setLocation(RouteTrip.asRouteTarget(newId));
      } else {
        // Shouldn't reach this block, but included for completeness
        elForm.reset();
        setIsFormLoading(false);
        onFormSuccess();
      }
    };
  }, [
    mode,
    publishToast,
    onFormSuccess,
    tripId,
    userId,
    setLocation,
    activities,
    tripTimeZone,
    tripSharingLevel,
    currentTimeZone,
    currentRegion,
    currentCurrency,
    currentStartDate,
    currentEndDate,
  ]);

  const fieldSelectCurrency = useMemo(() => {
    return (
      <Select.Root
        name="currency"
        value={currentCurrency}
        onValueChange={setCurrentCurrency}
        required
        disabled={isFormLoading}
      >
        <Select.Trigger id={idCurrency} />
        <Select.Content>
          {currencies.map((currency) => {
            return (
              <Select.Item key={currency} value={currency}>
                {currency}
              </Select.Item>
            );
          })}
        </Select.Content>
      </Select.Root>
    );
  }, [currencies, idCurrency, isFormLoading, currentCurrency]);

  const fieldSelectTimeZone = useMemo(() => {
    return (
      <Select.Root
        name="timeZone"
        value={currentTimeZone}
        onValueChange={handleTimeZoneChange}
        required
        disabled={isFormLoading}
      >
        <Select.Trigger id={idTimeZone} />
        <Select.Content>
          {timeZones.map((tz) => {
            return (
              <Select.Item key={tz} value={tz}>
                {tz}
              </Select.Item>
            );
          })}
        </Select.Content>
      </Select.Root>
    );
  }, [
    timeZones,
    currentTimeZone,
    idTimeZone,
    isFormLoading,
    handleTimeZoneChange,
  ]);

  const fieldSelectRegion = useMemo(() => {
    return (
      <Select.Root
        name="region"
        value={currentRegion}
        onValueChange={handleRegionChange}
        required
        disabled={isFormLoading}
      >
        <Select.Trigger id={idRegion} />
        <Select.Content>
          {REGIONS_LIST.map(([regionCode, regionName]) => {
            return (
              <Select.Item key={regionCode} value={regionCode}>
                {regionName}
              </Select.Item>
            );
          })}
        </Select.Content>
      </Select.Root>
    );
  }, [currentRegion, idRegion, isFormLoading, handleRegionChange]);

  return (
    <form
      onInput={() => {
        setErrorMessage('');
      }}
      onSubmit={(e) => {
        e.preventDefault();
        const elForm = e.currentTarget;
        setIsFormLoading(true);
        void handleForm()(elForm);
      }}
    >
      <Flex direction="column" gap="2">
        <Text color={dangerToken} size="2">
          {errorMessage}&nbsp;
        </Text>
        <Text as="label" htmlFor={idTitle}>
          Trip name{' '}
          <Text weight="light" size="1">
            (required)
          </Text>
        </Text>
        <TextField.Root
          defaultValue={tripTitle}
          placeholder="Enter trip name"
          name="title"
          type="text"
          id={idTitle}
          required
          disabled={isFormLoading}
        />

        <Text as="label" htmlFor={idRegion}>
          Destination's region{' '}
          <Text weight="light" size="1">
            (required)
          </Text>
          <br />
          <Text weight="light" size="1">
            This will be used as the general location when selecting coordinates
            in activities. Selecting a region will auto-populate the timezone
            field.
          </Text>
        </Text>
        {fieldSelectRegion}

        <Text as="label" htmlFor={idTimeZone}>
          Destination's time zone{' '}
          <Text weight="light" size="1">
            (required)
          </Text>
          {mode === TripFormMode.Edit ? (
            <>
              <br />
              <Text weight="light" size="1">
                Editing this value will adjust all the activities to this local
                time zone
              </Text>
            </>
          ) : null}
        </Text>
        {fieldSelectTimeZone}

        <Text as="label">
          Start date{' '}
          <Text weight="light" size="1">
            (in destination's time zone; required)
          </Text>
        </Text>
        <DateTimePicker
          value={currentStartDate}
          onChange={handleStartDateChange}
          mode={DateTimePickerMode.Date}
          disabled={isFormLoading}
          name="startDate"
          required
          aria-label="Trip start date"
          placeholder="Select start date"
        />

        <Text as="label">
          End date{' '}
          <Text weight="light" size="1">
            (in destination's time zone; required)
          </Text>
        </Text>
        <DateTimePicker
          value={currentEndDate}
          onChange={handleEndDateChange}
          mode={DateTimePickerMode.Date}
          disabled={isFormLoading}
          name="endDate"
          required
          aria-label="Trip end date"
          placeholder="Select end date"
          min={currentStartDate}
        />

        <Text as="label" htmlFor={idCurrency}>
          Destination's currency{' '}
          <Text weight="light" size="1">
            (required)
          </Text>
          <br />
          <Text weight="light" size="1">
            This will be used as the default currency in expenses.
            {mode === TripFormMode.Edit
              ? ' Editing this value will not change existing expenses '
              : null}
          </Text>
        </Text>
        {fieldSelectCurrency}

        <Text as="label" htmlFor={idOriginCurrency}>
          Origin's currency{' '}
          <Text weight="light" size="1">
            (required)
          </Text>
          <br />
          <Text weight="light" size="1">
            This will be used as the default origin's currency in expenses.
            {mode === TripFormMode.Edit
              ? ' Editing this value will not change existing expenses '
              : null}
          </Text>
        </Text>
        <Select.Root
          name="originCurrency"
          defaultValue={tripOriginCurrency}
          required
          disabled={isFormLoading}
        >
          <Select.Trigger id={idOriginCurrency} />
          <Select.Content>
            {currencies.map((currency) => {
              return (
                <Select.Item key={currency} value={currency}>
                  {currency}
                </Select.Item>
              );
            })}
          </Select.Content>
        </Select.Root>
      </Flex>
      <Flex gap="3" mt="5" justify="end">
        <Button
          type="button"
          size="2"
          variant="soft"
          color="gray"
          onClick={onFormCancel}
          loading={isFormLoading}
        >
          Cancel
        </Button>
        <Button type="submit" size="2" variant="solid" loading={isFormLoading}>
          Save
        </Button>
      </Flex>
    </form>
  );
}
