import { Button, Flex, Select, Text, TextField } from '@radix-ui/themes';
import type { DateTime } from 'luxon';
import type { SubmitEvent } from 'react';
import { useCallback, useId, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { CurrencySelect } from '../common/CurrencySelect/CurrencySelect';
import { DateTimePicker } from '../common/DatePicker2/DateTimePicker';
import { DateTimePickerMode } from '../common/DatePicker2/DateTimePickerMode';
import { TimeZoneSelect } from '../common/TimeZoneSelect/TimeZoneSelect';
import { dangerToken } from '../common/ui';
import {
  ALL_CURRENCIES,
  getDefaultCurrencyForRegion,
} from '../data/intl/currencies';
import { REGIONS_LIST } from '../data/intl/regions';
import {
  ALL_TIMEZONES,
  getDefaultTimezoneForRegion,
} from '../data/intl/timezones';
import { useBoundStore } from '../data/store';
import { RouteTrip } from '../Routes/routes';
import { dbAddTrip, dbUpdateTrip } from './db';
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
  const [currentOriginCurrency, setCurrentOriginCurrency] =
    useState(tripOriginCurrency);
  const [currentStartDate, setCurrentStartDate] = useState<
    DateTime | undefined
  >(tripStartDateTime);
  const [currentEndDate, setCurrentEndDate] = useState<DateTime | undefined>(
    tripEndDateTime,
  );

  const [errorMessage, setErrorMessage] = useState('');

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
        if (defaultTimezone && ALL_TIMEZONES.includes(defaultTimezone)) {
          handleTimeZoneChange(defaultTimezone);
        }
      }
      if (mode === TripFormMode.New || currentCurrency === tripCurrency) {
        const defaultCurrency = getDefaultCurrencyForRegion(newRegion);
        if (defaultCurrency && ALL_CURRENCIES.includes(defaultCurrency)) {
          setCurrentCurrency(defaultCurrency);
        }
      }
    },
    [
      mode,
      currentTimeZone,
      tripTimeZone,
      currentCurrency,
      tripCurrency,
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
        await dbUpdateTrip({
          id: tripId,
          title,
          timeZone,
          timestampStart: dateStartDateTime.toMillis(),
          timestampEnd: dateEndDateTime.toMillis(),
          region,
          currency,
          originCurrency,
          sharingLevel: tripSharingLevel,
        });
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
    tripSharingLevel,
    currentTimeZone,
    currentRegion,
    currentCurrency,
    currentStartDate,
    currentEndDate,
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

  const onFormInput = useCallback(() => {
    setErrorMessage('');
  }, []);

  const onFormSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      const elForm = event.currentTarget;
      setIsFormLoading(true);
      void handleForm()(elForm);
    },
    [handleForm],
  );

  return (
    <form onInput={onFormInput} onSubmit={onFormSubmit}>
      <Flex direction="column" gap="2">
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
          Destination's default time zone{' '}
          <Text weight="light" size="1">
            (required)
          </Text>
        </Text>
        <TimeZoneSelect
          name="timeZone"
          id={idTimeZone}
          value={currentTimeZone}
          isFormLoading={isFormLoading}
          handleChange={handleTimeZoneChange}
        />

        <Text as="label">
          Start date{' '}
          <Text weight="light" size="1">
            (in destination's default time zone; required)
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
            (in destination's default time zone; required)
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
        <CurrencySelect
          name="currency"
          id={idCurrency}
          value={currentCurrency}
          isFormLoading={isFormLoading}
          handleChange={setCurrentCurrency}
        />

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
        <CurrencySelect
          id={idOriginCurrency}
          name="originCurrency"
          value={currentOriginCurrency}
          isFormLoading={isFormLoading}
          handleChange={setCurrentOriginCurrency}
        />
      </Flex>
      {mode === TripFormMode.Edit ? (
        <Flex mt="5">
          <Text size="1">
            <Text weight="bold" color={dangerToken} size="1">
              Warning:
            </Text>{' '}
            Changing trip start date, end date, and time zone may cause existing
            activities, accommodations, and day plans{' '}
            <Text weight="bold" size="1">
              to disappear from the trip view
            </Text>{' '}
            as existing activities, accommodations, and day plans' time zones
            are not changed, and therefore they may fall outside the new trip's
            date range.
          </Text>
        </Flex>
      ) : null}
      <Flex mt="5" justify="end">
        <Text color={dangerToken} size="2">
          {errorMessage}&nbsp;
        </Text>
      </Flex>
      <Flex gap="3" mt="2" justify="end">
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
