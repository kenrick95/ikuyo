import { Button, Flex, Select, Text, TextField } from '@radix-ui/themes';
import { useCallback, useId, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { getDefaultCurrencyForRegion } from '../data/intl/currencies';
import { REGIONS_LIST } from '../data/intl/regions';
import { getDefaultTimezoneForRegion } from '../data/intl/timezones';
import { useBoundStore } from '../data/store';
import { RouteTrip } from '../Routes/routes';
import { dangerToken } from '../ui';
import { dbAddTrip, dbUpdateTrip } from './db';
import type { TripSliceActivity } from './store/types';
import { TripFormMode } from './TripFormMode';
import { getDateTimeFromDateInput } from './time';
import {
  TripSharingLevel,
  type TripSharingLevelType,
} from './tripSharingLevel';

export function TripForm({
  mode,
  tripId,
  tripStartStr,
  tripEndStr,
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
  tripStartStr: string;
  tripEndStr: string;
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
  const idTimeStart = useId();
  const idTimeEnd = useId();
  const idTimeZone = useId();
  const idCurrency = useId();
  const idOriginCurrency = useId();
  const idRegion = useId();
  const publishToast = useBoundStore((state) => state.publishToast);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [currentTimeZone, setCurrentTimeZone] = useState(tripTimeZone);
  const [currentRegion, setCurrentRegion] = useState(tripRegion);
  const [currentCurrency, setCurrentCurrency] = useState(tripCurrency);

  const [errorMessage, setErrorMessage] = useState('');
  const timeZones = useMemo(() => Intl.supportedValuesOf('timeZone'), []);
  const currencies = useMemo(() => Intl.supportedValuesOf('currency'), []);

  // Handler for region change to auto-populate timezone
  const handleRegionChange = useCallback(
    (newRegion: string) => {
      setCurrentRegion(newRegion);

      // Only auto-set timezone if it's not already set (for new trips) or if user hasn't manually changed it
      if (mode === TripFormMode.New || currentTimeZone === tripTimeZone) {
        const defaultTimezone = getDefaultTimezoneForRegion(newRegion);
        if (defaultTimezone && timeZones.includes(defaultTimezone)) {
          setCurrentTimeZone(defaultTimezone);
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
      const dateStartStr = (formData.get('startDate') as string | null) ?? '';
      const dateEndStr = (formData.get('endDate') as string | null) ?? '';
      const timeZone = currentTimeZone;
      const region = currentRegion;
      const currency = currentCurrency;
      const originCurrency =
        (formData.get('originCurrency') as string | null) ?? '';

      const dateStartDateTime = getDateTimeFromDateInput(
        dateStartStr,
        timeZone,
      );
      const dateEndDateTime = getDateTimeFromDateInput(
        dateEndStr,
        timeZone,
      ).plus({ day: 1 });
      console.log('TripForm', {
        mode,
        location,
        tripId,
        title,
        timeZone,
        region,
        currency,
        originCurrency,
        dateStartStr,
        dateEndStr,
        dateStartDateTime,
        dateEndDateTime,
      });
      if (
        !title ||
        !dateStartStr ||
        !dateEndStr ||
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
        onValueChange={setCurrentTimeZone}
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
  }, [timeZones, currentTimeZone, idTimeZone, isFormLoading]);

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
        <Text as="label" htmlFor={idTimeStart}>
          Start date{' '}
          <Text weight="light" size="1">
            (first day of trip, in destination's time zone; required)
          </Text>
        </Text>
        <TextField.Root
          id={idTimeStart}
          name="startDate"
          type="date"
          defaultValue={tripStartStr}
          required
          disabled={isFormLoading}
        />
        <Text as="label" htmlFor={idTimeEnd}>
          End date{' '}
          <Text weight="light" size="1">
            (final day of trip, in destination's time zone; required)
          </Text>
        </Text>
        <TextField.Root
          id={idTimeEnd}
          name="endDate"
          type="date"
          defaultValue={tripEndStr}
          required
          disabled={isFormLoading}
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
