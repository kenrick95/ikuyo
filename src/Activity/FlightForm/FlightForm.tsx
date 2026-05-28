import {
  Button,
  Flex,
  Switch,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes';
import type { DateTime } from 'luxon';
import type { SubmitEvent } from 'react';
import { useCallback, useId, useReducer, useState } from 'react';
import { DateTimePicker } from '../../common/DatePicker2/DateTimePicker';
import { DateTimePickerMode } from '../../common/DatePicker2/DateTimePickerMode';
import { EmojiTextField } from '../../common/EmojiTextField/EmojiTextField';
import { TimeZoneSelect } from '../../common/TimeZoneSelect/TimeZoneSelect';
import { dangerToken } from '../../common/ui';
import { useBoundStore } from '../../data/store';
import { ActivityMap } from '../ActivityDialog/ActivityDialogMap';
import {
  ActivityFormMode,
  type ActivityFormModeType,
} from '../ActivityForm/ActivityFormMode';
import {
  ActivityFlag,
  addActivityFlag,
  hasActivityFlag,
  updateActivityFlag,
} from '../activityFlag';
import { dbAddActivity, dbUpdateActivity } from '../db';
import { airportGeocodingRequest } from './FlightFormGeocoding';

interface LocationCoordinateState {
  enabled: [boolean, boolean];
  lat: [number | null | undefined, number | null | undefined];
  lng: [number | null | undefined, number | null | undefined];
  zoom: [number | null | undefined, number | null | undefined];
}

function coordinateStateReducer(
  state: LocationCoordinateState,
  action:
    | { type: 'setMapZoom'; index: number; zoom: number }
    | { type: 'setMarkerCoordinate'; index: number; lat: number; lng: number }
    | {
        type: 'setEnabled';
        index: number;
        lat: number | null | undefined;
        lng: number | null | undefined;
        zoom: number | null | undefined;
      }
    | { type: 'setDisabled'; index: number },
): LocationCoordinateState {
  switch (action.type) {
    case 'setEnabled': {
      const newState = { ...state };
      newState.enabled[action.index] = true;
      newState.lat[action.index] = action.lat;
      newState.lng[action.index] = action.lng;
      newState.zoom[action.index] = action.zoom;
      return newState;
    }
    case 'setDisabled': {
      const newState = { ...state };
      newState.enabled[action.index] = false;
      return newState;
    }
    case 'setMapZoom': {
      const newState = { ...state };
      newState.zoom[action.index] = action.zoom;
      return newState;
    }
    case 'setMarkerCoordinate': {
      const newState = { ...state };
      newState.lat[action.index] = action.lat;
      newState.lng[action.index] = action.lng;
      return newState;
    }
    default:
      return state;
  }
}

export function FlightForm({
  mode,
  activityId,
  tripId,
  tripStartDateTime,
  tripEndDateTime,
  tripTimeZone,
  tripRegion,
  activityTitle,
  activityIcon,
  activityStartDateTime,
  activityEndDateTime,
  activityLocation,
  activityLocationLng,
  activityLocationLat,
  activityLocationZoom,
  activityLocationDestination,
  activityLocationDestinationLng,
  activityLocationDestinationLat,
  activityLocationDestinationZoom,
  activityDescription,
  activityFlags,
  onFormSuccess,
  onFormCancel,
}: {
  mode: ActivityFormModeType;
  activityId?: string;
  tripId?: string;
  tripStartDateTime: DateTime | undefined;
  tripEndDateTime: DateTime | undefined;
  tripTimeZone: string;
  tripRegion: string;
  activityTitle: string;
  activityIcon?: string | null | undefined;
  activityStartDateTime: DateTime | undefined;
  activityEndDateTime: DateTime | undefined;
  activityLocation: string;
  activityLocationLat: number | null | undefined;
  activityLocationLng: number | null | undefined;
  activityLocationZoom: number | null | undefined;
  activityLocationDestination: string | null | undefined;
  activityLocationDestinationLat: number | null | undefined;
  activityLocationDestinationLng: number | null | undefined;
  activityLocationDestinationZoom: number | null | undefined;
  activityDescription: string;
  activityFlags: number | null | undefined;
  onFormSuccess: () => void;
  onFormCancel: () => void;
}) {
  const idForm = useId();
  const idTitle = useId();
  const idTimeStart = useId();
  const idTimeEnd = useId();
  const idFrom = useId();
  const idTo = useId();
  const idCoordinatesFrom = useId();
  const idCoordinatesTo = useId();
  const idDescription = useId();
  const idIsIdea = useId();

  const publishToast = useBoundStore((state) => state.publishToast);
  const setTripLocalState = useBoundStore((state) => state.setTripLocalState);
  const [errorMessage, setErrorMessage] = useState('');

  const [isIdea, setIsIdea] = useState(() =>
    hasActivityFlag(activityFlags, ActivityFlag.IsIdea),
  );

  const [startDateTime, setStartDateTime] = useState<DateTime | undefined>(
    activityStartDateTime,
  );
  const [endDateTime, setEndDateTime] = useState<DateTime | undefined>(
    activityEndDateTime,
  );
  const [startTimeZone, setStartTimeZone] = useState<string>(
    activityStartDateTime?.zoneName ?? tripTimeZone,
  );
  const [endTimeZone, setEndTimeZone] = useState<string>(
    activityEndDateTime?.zoneName ?? tripTimeZone,
  );

  const [locationFieldsState, dispatchLocationFieldsState] = useReducer(
    coordinateStateReducer,
    {
      enabled: [
        activityLocationLat != null && activityLocationLng != null,
        activityLocationDestinationLat != null &&
          activityLocationDestinationLng != null,
      ],
      lat: [activityLocationLat, activityLocationDestinationLat],
      lng: [activityLocationLng, activityLocationDestinationLng],
      zoom: [activityLocationZoom ?? 9, activityLocationDestinationZoom ?? 9],
    },
  );

  const setCoordinateEnabled = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        if (locationFieldsState.lat[0] && locationFieldsState.lng[0]) {
          dispatchLocationFieldsState({
            type: 'setEnabled',
            index: 0,
            lat: locationFieldsState.lat[0],
            lng: locationFieldsState.lng[0],
            zoom: locationFieldsState.zoom[0],
          });
        } else {
          const elFrom = document.getElementById(idFrom) as HTMLInputElement;
          const [lng, lat, zoom] = await airportGeocodingRequest(
            elFrom?.value ?? '',
          );
          dispatchLocationFieldsState({
            type: 'setEnabled',
            index: 0,
            lat,
            lng,
            zoom: zoom ?? locationFieldsState.zoom[0],
          });
        }
      } else {
        dispatchLocationFieldsState({ type: 'setDisabled', index: 0 });
      }
    },
    [
      idFrom,
      locationFieldsState.lat,
      locationFieldsState.lng,
      locationFieldsState.zoom,
    ],
  );

  const setCoordinateEnabledForDestination = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        if (locationFieldsState.lat[1] && locationFieldsState.lng[1]) {
          dispatchLocationFieldsState({
            type: 'setEnabled',
            index: 1,
            lat: locationFieldsState.lat[1],
            lng: locationFieldsState.lng[1],
            zoom: locationFieldsState.zoom[1],
          });
        } else {
          const elTo = document.getElementById(idTo) as HTMLInputElement;
          const [lng, lat, zoom] = await airportGeocodingRequest(
            elTo?.value ?? '',
          );
          dispatchLocationFieldsState({
            type: 'setEnabled',
            index: 1,
            lat,
            lng,
            zoom: zoom ?? locationFieldsState.zoom[1],
          });
        }
      } else {
        dispatchLocationFieldsState({ type: 'setDisabled', index: 1 });
      }
    },
    [
      idTo,
      locationFieldsState.lat,
      locationFieldsState.lng,
      locationFieldsState.zoom,
    ],
  );

  const setMarkerCoordinate = useCallback(
    (coordinate: { lng: number; lat: number }) => {
      dispatchLocationFieldsState({
        type: 'setMarkerCoordinate',
        index: 0,
        lat: coordinate.lat,
        lng: coordinate.lng,
      });
    },
    [],
  );
  const setMarkerCoordinateForDestination = useCallback(
    (coordinate: { lng: number; lat: number }) => {
      dispatchLocationFieldsState({
        type: 'setMarkerCoordinate',
        index: 1,
        lat: coordinate.lat,
        lng: coordinate.lng,
      });
    },
    [],
  );
  const setMapZoom = useCallback((zoom: number) => {
    dispatchLocationFieldsState({ type: 'setMapZoom', index: 0, zoom });
  }, []);
  const setMapZoomForDestination = useCallback((zoom: number) => {
    dispatchLocationFieldsState({ type: 'setMapZoom', index: 1, zoom });
  }, []);

  const handleTimeZoneStartChange = useCallback(
    (newTimeZone: string) => {
      setStartTimeZone(newTimeZone);
      if (startDateTime) {
        setStartDateTime(
          startDateTime.setZone(newTimeZone, { keepLocalTime: true }),
        );
      }
    },
    [startDateTime],
  );
  const handleTimeZoneEndChange = useCallback(
    (newTimeZone: string) => {
      setEndTimeZone(newTimeZone);
      if (endDateTime) {
        setEndDateTime(
          endDateTime.setZone(newTimeZone, { keepLocalTime: true }),
        );
      }
    },
    [endDateTime],
  );
  const handleStartDateTimeChange = useCallback(
    (newDateTime: DateTime | undefined) => {
      setStartDateTime(
        newDateTime
          ? newDateTime.setZone(startTimeZone, { keepLocalTime: true })
          : undefined,
      );
    },
    [startTimeZone],
  );
  const handleEndDateTimeChange = useCallback(
    (newDateTime: DateTime | undefined) => {
      setEndDateTime(
        newDateTime
          ? newDateTime.setZone(endTimeZone, { keepLocalTime: true })
          : undefined,
      );
    },
    [endTimeZone],
  );

  const handleSubmit = useCallback(() => {
    return async (elForm: HTMLFormElement) => {
      setErrorMessage('');
      if (!elForm.reportValidity()) return;

      const formData = new FormData(elForm);
      const title = (formData.get('title') as string | null) ?? '';
      const iconRaw = (formData.get('icon') as string | null) ?? '';
      const icon = iconRaw.trim();
      const description = (formData.get('description') as string | null) ?? '';
      const from = (formData.get('from') as string | null) ?? '';
      const to = (formData.get('to') as string | null) ?? '';

      if (!title) return;
      if (!from) {
        setErrorMessage('Departure airport is required');
        return;
      }
      if (!to) {
        setErrorMessage('Arrival airport is required');
        return;
      }
      if (
        endDateTime &&
        startDateTime &&
        endDateTime.diff(startDateTime).as('minute') < 0
      ) {
        setErrorMessage('Arrival time must be after departure time');
        return;
      }
      if (
        tripStartDateTime &&
        startDateTime &&
        startDateTime < tripStartDateTime
      ) {
        setErrorMessage(
          'Departure time cannot be earlier than trip start time',
        );
        return;
      }
      if (tripEndDateTime && endDateTime && endDateTime > tripEndDateTime) {
        setErrorMessage('Arrival time cannot be later than trip end time');
        return;
      }

      // Always set IsFlight flag; preserve IsIdea
      let flags = addActivityFlag(activityFlags, ActivityFlag.IsFlight);
      flags = updateActivityFlag(flags, ActivityFlag.IsIdea, isIdea);

      if (mode === ActivityFormMode.Edit && activityId) {
        await dbUpdateActivity({
          id: activityId,
          title,
          icon: icon || null,
          description,
          location: from,
          locationLat: locationFieldsState.enabled[0]
            ? locationFieldsState.lat[0]
            : null,
          locationLng: locationFieldsState.enabled[0]
            ? locationFieldsState.lng[0]
            : null,
          locationZoom: locationFieldsState.enabled[0]
            ? locationFieldsState.zoom[0]
            : null,
          locationDestination: to,
          locationDestinationLat: locationFieldsState.enabled[1]
            ? locationFieldsState.lat[1]
            : null,
          locationDestinationLng: locationFieldsState.enabled[1]
            ? locationFieldsState.lng[1]
            : null,
          locationDestinationZoom: locationFieldsState.enabled[1]
            ? locationFieldsState.zoom[1]
            : null,
          timestampStart: startDateTime ? startDateTime.toMillis() : null,
          timestampEnd: endDateTime ? endDateTime.toMillis() : null,
          timeZoneStart: startDateTime ? startDateTime.zoneName : null,
          timeZoneEnd: endDateTime ? endDateTime.zoneName : null,
          flags,
        });
        publishToast({
          root: {},
          title: { children: `Flight ${title} edited` },
          close: {},
        });
      } else if (mode === ActivityFormMode.New && tripId) {
        if (endDateTime) {
          setTripLocalState(tripId, {
            activityTimestampStart: endDateTime.toMillis(),
          });
        }
        await dbAddActivity(
          {
            title,
            icon: icon || null,
            description,
            location: from,
            locationLat: locationFieldsState.enabled[0]
              ? locationFieldsState.lat[0]
              : null,
            locationLng: locationFieldsState.enabled[0]
              ? locationFieldsState.lng[0]
              : null,
            locationZoom: locationFieldsState.enabled[0]
              ? locationFieldsState.zoom[0]
              : null,
            locationDestination: to,
            locationDestinationLat: locationFieldsState.enabled[1]
              ? locationFieldsState.lat[1]
              : null,
            locationDestinationLng: locationFieldsState.enabled[1]
              ? locationFieldsState.lng[1]
              : null,
            locationDestinationZoom: locationFieldsState.enabled[1]
              ? locationFieldsState.zoom[1]
              : null,
            timestampStart: startDateTime ? startDateTime.toMillis() : null,
            timestampEnd: endDateTime ? endDateTime.toMillis() : null,
            timeZoneStart: startDateTime ? startDateTime.zoneName : null,
            timeZoneEnd: endDateTime ? endDateTime.zoneName : null,
            flags,
          },
          { tripId },
        );
        publishToast({
          root: {},
          title: { children: `Flight ${title} added` },
          close: {},
        });
      }

      elForm.reset();
      onFormSuccess();
    };
  }, [
    activityFlags,
    activityId,
    endDateTime,
    isIdea,
    locationFieldsState,
    mode,
    onFormSuccess,
    publishToast,
    setTripLocalState,
    startDateTime,
    tripEndDateTime,
    tripId,
    tripStartDateTime,
  ]);

  const onFormInput = useCallback(() => {
    setErrorMessage('');
  }, []);

  const onFormSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      const elForm = event.currentTarget;
      void handleSubmit()(elForm);
    },
    [handleSubmit],
  );

  return (
    <form id={idForm} onInput={onFormInput} onSubmit={onFormSubmit}>
      <Flex direction="column" gap="2">
        <Text as="label" htmlFor={idTitle}>
          Flight number{' '}
          <Text weight="light" size="1">
            (required)
          </Text>
        </Text>
        <EmojiTextField
          defaultValue={activityTitle}
          placeholder="e.g. QF001"
          name="title"
          id={idTitle}
          iconName="icon"
          defaultIcon={activityIcon}
          required
          clearable
        />

        <Text as="label" htmlFor={idFrom}>
          From — departure airport{' '}
          <Text weight="light" size="1">
            (IATA code or airport name, required)
          </Text>
        </Text>
        <TextField.Root
          id={idFrom}
          name="from"
          placeholder="e.g. SYD or Sydney Airport"
          defaultValue={activityLocation}
          required
        />

        <Text as="label" htmlFor={idCoordinatesFrom}>
          Set departure airport coordinates
        </Text>
        <Switch
          id={idCoordinatesFrom}
          checked={locationFieldsState.enabled[0]}
          onCheckedChange={setCoordinateEnabled}
        />
        {locationFieldsState.enabled[0] ? (
          <ActivityMap
            mapOptions={{
              lng: locationFieldsState.lng[0] ?? 0,
              lat: locationFieldsState.lat[0] ?? 0,
              zoom: locationFieldsState.zoom[0] ?? 9,
              // Don't use 'region' to allow free choosing of airport around the world
            }}
            marker={
              locationFieldsState.lng[0] != null &&
              locationFieldsState.lat[0] != null
                ? {
                    lng: locationFieldsState.lng[0],
                    lat: locationFieldsState.lat[0],
                  }
                : undefined
            }
            setMarkerCoordinate={setMarkerCoordinate}
            setMapZoom={setMapZoom}
          />
        ) : null}

        <Text as="label" htmlFor={idTo}>
          To — arrival airport{' '}
          <Text weight="light" size="1">
            (IATA code or airport name, required)
          </Text>
        </Text>
        <TextField.Root
          id={idTo}
          name="to"
          placeholder="e.g. LHR or London Heathrow"
          defaultValue={activityLocationDestination ?? ''}
          required
        />

        <Text as="label" htmlFor={idCoordinatesTo}>
          Set arrival airport coordinates
        </Text>
        <Switch
          id={idCoordinatesTo}
          checked={locationFieldsState.enabled[1]}
          onCheckedChange={setCoordinateEnabledForDestination}
        />
        {locationFieldsState.enabled[1] ? (
          <ActivityMap
            mapOptions={{
              lng: locationFieldsState.lng[1] ?? 0,
              lat: locationFieldsState.lat[1] ?? 0,
              zoom: locationFieldsState.zoom[1] ?? 9,
              // Don't use 'region' to allow free choosing of airport around the world
            }}
            marker={
              locationFieldsState.lng[1] != null &&
              locationFieldsState.lat[1] != null
                ? {
                    lng: locationFieldsState.lng[1],
                    lat: locationFieldsState.lat[1],
                  }
                : undefined
            }
            setMarkerCoordinate={setMarkerCoordinateForDestination}
            setMapZoom={setMapZoomForDestination}
          />
        ) : null}

        <Text as="label">
          Departure time zone{' '}
          <Text weight="light" size="1">
            (trip default: {tripTimeZone})
          </Text>
        </Text>
        <TimeZoneSelect
          id="timeZoneStart"
          name="timeZoneStart"
          value={startTimeZone}
          handleChange={handleTimeZoneStartChange}
          isFormLoading={false}
        />
        <Text as="label" htmlFor={idTimeStart}>
          Departure time{' '}
          <Text weight="light" size="1">
            (in {startTimeZone})
          </Text>
        </Text>
        <DateTimePicker
          name="startTime"
          mode={DateTimePickerMode.DateTime}
          min={tripStartDateTime?.minus({ days: 1 })}
          max={tripEndDateTime?.plus({ days: 1 })}
          value={startDateTime}
          onChange={handleStartDateTimeChange}
          clearable={true}
        />

        <Text as="label">
          Arrival time zone{' '}
          <Text weight="light" size="1">
            (trip default: {tripTimeZone})
          </Text>
        </Text>
        <TimeZoneSelect
          id="timeZoneEnd"
          name="timeZoneEnd"
          value={endTimeZone}
          handleChange={handleTimeZoneEndChange}
          isFormLoading={false}
        />
        <Text as="label" htmlFor={idTimeEnd}>
          Arrival time{' '}
          <Text weight="light" size="1">
            (in {endTimeZone})
          </Text>
        </Text>
        <DateTimePicker
          name="endTime"
          mode={DateTimePickerMode.DateTime}
          min={tripStartDateTime?.minus({ days: 1 })}
          max={tripEndDateTime?.plus({ days: 1 })}
          value={endDateTime}
          onChange={handleEndDateTimeChange}
          clearable={true}
        />

        <Text as="label" htmlFor={idIsIdea}>
          Is this flight an idea?{' '}
          <Text weight="light" size="1">
            (if yes, will appear in activity idea list)
          </Text>
        </Text>
        <Switch id={idIsIdea} checked={isIdea} onCheckedChange={setIsIdea} />

        <Text as="label" htmlFor={idDescription}>
          Notes
        </Text>
        <TextArea
          defaultValue={activityDescription}
          placeholder="Enter notes (airline, booking reference, seat, etc.)"
          name="description"
          id={idDescription}
          style={{ minHeight: 120 }}
        />
      </Flex>
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
