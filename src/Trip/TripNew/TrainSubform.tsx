import { Flex, Select, Text, TextField } from '@radix-ui/themes';
import {
  type ChangeEvent,
  type FocusEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { stationGeocodingRequest } from '../../Activity/TrainForm/TrainFormGeocoding';
import { DateTimePicker } from '../../common/DatePicker2/DateTimePicker';
import { DateTimePickerMode } from '../../common/DatePicker2/DateTimePickerMode';
import { ALL_TIMEZONES } from '../../data/intl/timezones';
import s from './PageTripNew.module.css';
import type { TrainCapture } from './wizardReducer';

export type TrainSubformProps = {
  label: string;
  value: TrainCapture | null;
  originTimeZone: string;
  destinationTimeZone: string;
  originRegion: string;
  destinationRegion: string;
  isOutbound: boolean;
  error?: string;
  tripStartDate: Temporal.PlainDate | undefined;
  tripEndDate: Temporal.PlainDate | undefined;
  onChange: (train: TrainCapture | null) => void;
};

export function TrainSubform({
  label,
  value,
  originTimeZone,
  destinationTimeZone,
  originRegion,
  destinationRegion,
  isOutbound,
  error,
  tripStartDate,
  tripEndDate,
  onChange,
}: TrainSubformProps) {
  const defaultDepartureTz = isOutbound ? originTimeZone : destinationTimeZone;
  const defaultArrivalTz = isOutbound ? destinationTimeZone : originTimeZone;

  const current = value;
  const [editingDepartureTz, setEditingDepartureTz] = useState(false);
  const [editingArrivalTz, setEditingArrivalTz] = useState(false);
  const departureBadgeRef = useRef<HTMLButtonElement>(null);
  const arrivalBadgeRef = useRef<HTMLButtonElement>(null);
  const minDepartureDate: Temporal.PlainDate | undefined = useMemo(() => {
    if (!tripStartDate) return undefined;
    return tripStartDate.subtract({ days: 1 });
  }, [tripStartDate]);
  const maxDepartureDate: Temporal.PlainDate | undefined = useMemo(() => {
    if (!tripEndDate) return undefined;
    return tripEndDate.add({ days: 1 });
  }, [tripEndDate]);
  const minArrivalDate: Temporal.PlainDate | undefined = useMemo(() => {
    if (!tripStartDate) return undefined;
    return tripStartDate.subtract({ days: 1 });
  }, [tripStartDate]);
  const maxArrivalDate: Temporal.PlainDate | undefined = useMemo(() => {
    if (!tripEndDate) return undefined;
    return tripEndDate.add({ days: 1 });
  }, [tripEndDate]);

  const handleTrainNumberChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) =>
      onChange({ ...current, trainNumber: e.target.value }),
    [current, onChange],
  );
  const handleDepartureStationChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) =>
      onChange({
        ...current,
        departureStation: e.target.value,
        departureLat: undefined,
        departureLng: undefined,
        departureZoom: undefined,
      }),
    [current, onChange],
  );
  const handleDepartureStationBlur = useCallback(
    async (e: FocusEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      const query = e.target.value.trim();
      if (!query) return;
      const country = isOutbound ? originRegion : destinationRegion;
      const [lng, lat, zoom] = await stationGeocodingRequest(query, country);
      if (input.value.trim() !== query) return;
      onChange({
        departureStation: query,
        departureLat: lat,
        departureLng: lng,
        departureZoom: zoom,
      });
    },
    [onChange, isOutbound, originRegion, destinationRegion],
  );
  const handleArrivalStationChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) =>
      onChange({
        ...current,
        arrivalStation: e.target.value,
        arrivalLat: undefined,
        arrivalLng: undefined,
        arrivalZoom: undefined,
      }),
    [current, onChange],
  );
  const handleArrivalStationBlur = useCallback(
    async (e: FocusEvent<HTMLInputElement>) => {
      const query = e.target.value.trim();
      if (!query) return;
      const country = isOutbound ? destinationRegion : originRegion;
      const [lng, lat, zoom] = await stationGeocodingRequest(query, country);
      onChange({
        ...current,
        arrivalStation: query,
        arrivalLat: lat,
        arrivalLng: lng,
        arrivalZoom: zoom,
      });
    },
    [current, onChange, isOutbound, originRegion, destinationRegion],
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
    (date: Temporal.PlainDate | Temporal.PlainDateTime | undefined) => {
      return onChange({
        ...current,
        departureDateTime:
          date instanceof Temporal.PlainDate
            ? Temporal.PlainDateTime.from(date).with({
                hour: 0,
                minute: 0,
                second: 0,
                millisecond: 0,
              })
            : date,
      });
    },
    [current, onChange],
  );
  const handleArrivalDateChange = useCallback(
    (date: Temporal.PlainDate | Temporal.PlainDateTime | undefined) => {
      return onChange({
        ...current,
        arrivalDateTime:
          date instanceof Temporal.PlainDate
            ? Temporal.PlainDateTime.from(date).with({
                hour: 0,
                minute: 0,
                second: 0,
                millisecond: 0,
              })
            : date,
      });
    },
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
          <Text size="2">Train / service number</Text>
          <TextField.Root
            placeholder="e.g. TGV 6181"
            value={current?.trainNumber ?? ''}
            onChange={handleTrainNumberChange}
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2">Departure station</Text>
          <TextField.Root
            placeholder="e.g. Paris Gare de Lyon"
            value={current?.departureStation ?? ''}
            onChange={handleDepartureStationChange}
            onBlur={handleDepartureStationBlur}
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2">Arrival station</Text>
          <TextField.Root
            placeholder="e.g. Marseille Saint-Charles"
            value={current?.arrivalStation ?? ''}
            onChange={handleArrivalStationChange}
            onBlur={handleArrivalStationBlur}
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Flex justify="between" align="baseline">
            <Text size="2">Departure</Text>
            {editingDepartureTz ? (
              <Select.Root
                defaultOpen
                value={current?.departureTimeZone ?? defaultDepartureTz}
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
                {current?.departureTimeZone ?? defaultDepartureTz}
              </button>
            )}
          </Flex>
          <DateTimePicker
            value={current?.departureDateTime}
            onChange={handleDepartureDateChange}
            mode={DateTimePickerMode.DateTime}
            placeholder="Pick date & time"
            min={minDepartureDate}
            max={maxDepartureDate}
          />
        </Flex>

        <Flex direction="column" gap="1">
          <Flex justify="between" align="baseline">
            <Text size="2">Arrival</Text>
            {editingArrivalTz ? (
              <Select.Root
                defaultOpen
                value={current?.arrivalTimeZone ?? defaultArrivalTz}
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
                {current?.arrivalTimeZone ?? defaultArrivalTz}
              </button>
            )}
          </Flex>
          <DateTimePicker
            value={current?.arrivalDateTime}
            onChange={handleArrivalDateChange}
            mode={DateTimePickerMode.DateTime}
            placeholder="Pick date & time"
            min={minArrivalDate}
            max={maxArrivalDate}
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
