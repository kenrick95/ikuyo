import { Button, Flex, Select, Text, TextField } from '@radix-ui/themes';
import { useCallback, useId, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { REGIONS_LIST } from '../data/intl/regions';
import { useBoundStore } from '../data/store';
import { RouteTrip } from '../Routes/routes';
import { dangerToken } from '../ui';
import { dbAddTrip, dbUpdateTrip } from './db';
import type { TripSliceActivity } from './store';
import { TripFormMode } from './TripFormMode';
import { getDateTimeFromDateInput } from './time';

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

  const [errorMessage, setErrorMessage] = useState('');
  const timeZones = useMemo(() => Intl.supportedValuesOf('timeZone'), []);
  const currencies = useMemo(() => Intl.supportedValuesOf('currency'), []);
  const handleForm = useCallback(() => {
    return async (elForm: HTMLFormElement) => {
      setErrorMessage('');
      if (!elForm.reportValidity()) {
        return;
      }
      const formData = new FormData(elForm);
      const title = (formData.get('title') as string | null) ?? '';
      const dateStartStr = (formData.get('startDate') as string | null) ?? '';
      const dateEndStr = (formData.get('endDate') as string | null) ?? '';
      const timeZone = (formData.get('timeZone') as string | null) ?? '';
      const region = (formData.get('region') as string | null) ?? 'ZZ';
      const currency = (formData.get('currency') as string | null) ?? '';
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
        return;
      }
      if (dateEndDateTime.diff(dateStartDateTime).as('minute') < 0) {
        setErrorMessage('End date must be after start date');
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
        onFormSuccess();

        setLocation(RouteTrip.asRouteTarget(newId));
      } else {
        // Shouldn't reach this block, but included for completeness
        elForm.reset();
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
  ]);

  const fieldSelectCurrency = useMemo(() => {
    return (
      <Select.Root name="currency" defaultValue={tripCurrency} required>
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
  }, [currencies, tripCurrency, idCurrency]);

  const fieldSelectTimeZone = useMemo(() => {
    return (
      <Select.Root name="timeZone" defaultValue={tripTimeZone} required>
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
  }, [timeZones, tripTimeZone, idTimeZone]);

  const fieldSelectRegion = useMemo(() => {
    return (
      <Select.Root name="region" defaultValue={tripRegion} required>
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
  }, [tripRegion, idRegion]);

  return (
    <form
      onInput={() => {
        setErrorMessage('');
      }}
      onSubmit={(e) => {
        e.preventDefault();
        const elForm = e.currentTarget;
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
        />
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
        />

        <Text as="label" htmlFor={idRegion}>
          Destination's region{' '}
          <Text weight="light" size="1">
            (required)
          </Text>
          <br />
          <Text weight="light" size="1">
            This will be used as the general location when selecting coordinates
            in activities.
          </Text>
        </Text>
        {fieldSelectRegion}

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
        >
          Cancel
        </Button>
        <Button type="submit" size="2" variant="solid">
          Save
        </Button>
      </Flex>
    </form>
  );
}
