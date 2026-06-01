import { Flex, Select, Text, TextField } from '@radix-ui/themes';
import type { DateTime } from 'luxon';
import {
  type ChangeEvent,
  type FocusEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { airportGeocodingRequest } from '../../Activity/FlightForm/FlightFormGeocoding';
import { DateTimePicker } from '../../common/DatePicker2/DateTimePicker';
import { DateTimePickerMode } from '../../common/DatePicker2/DateTimePickerMode';
import { ALL_TIMEZONES } from '../../data/intl/timezones';
import s from './PageTripNew.module.css';
import type { FlightCapture } from './wizardReducer';

export type FlightSubformProps = {
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

export function FlightSubform({
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
  const emptyFlight = useMemo<FlightCapture>(
    () => ({
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
    }),
    [defaultDepartureTz, defaultArrivalTz],
  );
  const current = value ?? emptyFlight;
  const [editingDepartureTz, setEditingDepartureTz] = useState(false);
  const [editingArrivalTz, setEditingArrivalTz] = useState(false);
  const departureBadgeRef = useRef<HTMLButtonElement>(null);
  const arrivalBadgeRef = useRef<HTMLButtonElement>(null);

  const handleFlightNumberChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) =>
      onChange({ ...current, flightNumber: e.target.value }),
    [current, onChange],
  );
  const handleDepartureAirportChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) =>
      onChange({
        ...current,
        departureAirport: e.target.value,
        departureLat: undefined,
        departureLng: undefined,
        departureZoom: undefined,
      }),
    [current, onChange],
  );
  const handleDepartureAirportBlur = useCallback(
    async (e: FocusEvent<HTMLInputElement>) => {
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
    },
    [current, onChange],
  );
  const handleArrivalAirportChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) =>
      onChange({
        ...current,
        arrivalAirport: e.target.value,
        arrivalLat: undefined,
        arrivalLng: undefined,
        arrivalZoom: undefined,
      }),
    [current, onChange],
  );
  const handleArrivalAirportBlur = useCallback(
    async (e: FocusEvent<HTMLInputElement>) => {
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
    },
    [current, onChange],
  );
  const handleDepartureTzChange = useCallback(
    (tz: string) => onChange({ ...current, departureTimeZone: tz }),
    [current, onChange],
  );
  const handleDepartureTzOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setEditingDepartureTz(false);
      setTimeout(() => departureBadgeRef.current?.focus(), 0);
    }
  }, []);
  const handleOpenDepartureTzEdit = useCallback(
    () => setEditingDepartureTz(true),
    [],
  );
  const handleArrivalTzChange = useCallback(
    (tz: string) => onChange({ ...current, arrivalTimeZone: tz }),
    [current, onChange],
  );
  const handleArrivalTzOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setEditingArrivalTz(false);
      setTimeout(() => arrivalBadgeRef.current?.focus(), 0);
    }
  }, []);
  const handleOpenArrivalTzEdit = useCallback(
    () => setEditingArrivalTz(true),
    [],
  );
  const handleDepartureDateChange = useCallback(
    (date: DateTime | undefined) =>
      onChange({ ...current, departureDateTime: date }),
    [current, onChange],
  );
  const handleArrivalDateChange = useCallback(
    (date: DateTime | undefined) =>
      onChange({ ...current, arrivalDateTime: date }),
    [current, onChange],
  );

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
            onChange={handleFlightNumberChange}
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2">Departure airport</Text>
          <TextField.Root
            placeholder="e.g. SYD or Sydney Airport"
            value={current.departureAirport}
            onChange={handleDepartureAirportChange}
            onBlur={handleDepartureAirportBlur}
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2">Arrival airport</Text>
          <TextField.Root
            placeholder="e.g. LHR or London Heathrow"
            value={current.arrivalAirport}
            onChange={handleArrivalAirportChange}
            onBlur={handleArrivalAirportBlur}
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Flex justify="between" align="baseline">
            <Text size="2">Departure</Text>
            {editingDepartureTz ? (
              <Select.Root
                defaultOpen
                value={current.departureTimeZone}
                onValueChange={handleDepartureTzChange}
                onOpenChange={handleDepartureTzOpenChange}
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
                onClick={handleOpenDepartureTzEdit}
              >
                {current.departureTimeZone}
              </button>
            )}
          </Flex>
          <DateTimePicker
            value={current.departureDateTime}
            onChange={handleDepartureDateChange}
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
                onValueChange={handleArrivalTzChange}
                onOpenChange={handleArrivalTzOpenChange}
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
                onClick={handleOpenArrivalTzEdit}
              >
                {current.arrivalTimeZone}
              </button>
            )}
          </Flex>
          <DateTimePicker
            value={current.arrivalDateTime}
            onChange={handleArrivalDateChange}
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
