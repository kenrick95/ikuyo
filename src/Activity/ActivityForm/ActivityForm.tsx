import { Button, Flex, Switch, Text, TextArea } from '@radix-ui/themes';
import type { DateTime } from 'luxon';
import type { SubmitEvent } from 'react';
import { useCallback, useId, useReducer, useState } from 'react';
import { DateTimeRangePicker } from '../../common/DateTimeRangePicker/DateTimeRangePicker';
import { EmojiTextField } from '../../common/EmojiTextField/EmojiTextField';
import { dangerToken } from '../../common/ui';
import { useBoundStore } from '../../data/store';
import { ActivityMap } from '../ActivityDialog/ActivityDialogMap';
import {
  ActivityFlag,
  hasActivityFlag,
  updateActivityFlag,
} from '../activityFlag';
import { dbAddActivity, dbUpdateActivity } from '../db';
import { geocodingRequest } from './ActivityFormGeocoding';
import {
  ActivityFormMode,
  type ActivityFormModeType,
} from './ActivityFormMode';

interface LocationCoordinateState {
  count: number;
  enabled: [boolean, boolean];
  lat: [number | null | undefined, number | null | undefined];
  lng: [number | null | undefined, number | null | undefined];
  zoom: [number | null | undefined, number | null | undefined];
}

function coordinateStateReducer(
  state: LocationCoordinateState,
  action:
    | { type: 'setCount'; count: number }
    | { type: 'setMapZoom'; index: number; zoom: number }
    | { type: 'setMarkerCoordinate'; index: number; lat: number; lng: number }
    | {
        type: 'setEnabled';
        index: number;
        lat: number | null | undefined;
        lng: number | null | undefined;
        zoom: number | null | undefined;
      }
    | {
        type: 'setDisabled';
        index: number;
      },
): LocationCoordinateState {
  switch (action.type) {
    case 'setCount': {
      const newState = {
        ...state,
        count: action.count,
      };
      return newState;
    }
    case 'setEnabled': {
      const newState = {
        ...state,
      };
      newState.enabled[action.index] = true;
      newState.lat[action.index] = action.lat;
      newState.lng[action.index] = action.lng;
      newState.zoom[action.index] = action.zoom;
      return newState;
    }
    case 'setDisabled': {
      const newState = {
        ...state,
      };
      newState.enabled[action.index] = false;
      return newState;
    }
    case 'setMapZoom': {
      const newState = {
        ...state,
      };
      newState.zoom[action.index] = action.zoom;
      return newState;
    }
    case 'setMarkerCoordinate': {
      const newState = {
        ...state,
      };
      newState.lat[action.index] = action.lat;
      newState.lng[action.index] = action.lng;
      return newState;
    }
    default:
      return state;
  }
}

export function ActivityForm({
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

  activityFlags: number | null | undefined;

  activityDescription: string;

  onFormSuccess: () => void;
  onFormCancel: () => void;
}) {
  const idForm = useId();
  const idTitle = useId();
  const idLocation = useId();
  const idTwoLocationEnabled = useId();
  const idLocationDestination = useId();
  const idCoordinatesDestination = useId();
  const idIsIdea = useId();

  const idDescription = useId();
  const idCoordinates = useId();
  const publishToast = useBoundStore((state) => state.publishToast);
  const [errorMessage, setErrorMessage] = useState('');

  const setTripLocalState = useBoundStore((state) => state.setTripLocalState);

  const [isIdea, setIsIdea] = useState(() => {
    return hasActivityFlag(activityFlags, ActivityFlag.IsIdea);
  });

  // State for DateTime pickers
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
      count:
        (activityLocationDestinationLat != null &&
          activityLocationDestinationLng != null) ||
        (activityLocationDestination != null &&
          activityLocationDestination !== '')
          ? 2
          : 1,
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
          // if coordinates are not set, use geocoding from location to get the coordinates
          const elLocation = document.getElementById(
            idLocation,
          ) as HTMLInputElement;
          const location = elLocation.value;
          const [lng, lat, zoom] = await geocodingRequest(location, tripRegion);
          dispatchLocationFieldsState({
            type: 'setEnabled',
            index: 0,
            lat: lat,
            lng: lng,
            zoom: zoom ?? locationFieldsState.zoom[0],
          });
        }
      } else {
        dispatchLocationFieldsState({
          type: 'setDisabled',
          index: 0,
        });
      }
    },
    [
      idLocation,
      tripRegion,
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
          // if coordinates are not set, use geocoding from location to get the coordinates
          const elLocation = document.getElementById(
            idLocationDestination,
          ) as HTMLInputElement;
          const location = elLocation.value;
          const [lng, lat, zoom] = await geocodingRequest(location, tripRegion);
          dispatchLocationFieldsState({
            type: 'setEnabled',
            index: 1,
            lat: lat,
            lng: lng,
            zoom: zoom ?? locationFieldsState.zoom[1],
          });
        }
      } else {
        dispatchLocationFieldsState({
          type: 'setDisabled',
          index: 1,
        });
      }
    },
    [
      idLocationDestination,
      tripRegion,
      locationFieldsState.lat,
      locationFieldsState.lng,
      locationFieldsState.zoom,
    ],
  );
  const setMarkerCoordinate = useCallback(
    async (coordinate: { lng: number; lat: number }) => {
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
    async (coordinate: { lng: number; lat: number }) => {
      dispatchLocationFieldsState({
        type: 'setMarkerCoordinate',
        index: 1,
        lat: coordinate.lat,
        lng: coordinate.lng,
      });
    },
    [],
  );
  const setMapZoom = useCallback(async (zoom: number) => {
    dispatchLocationFieldsState({
      type: 'setMapZoom',
      index: 0,
      zoom: zoom,
    });
  }, []);
  const setMapZoomForDestination = useCallback(async (zoom: number) => {
    dispatchLocationFieldsState({
      type: 'setMapZoom',
      index: 1,
      zoom: zoom,
    });
  }, []);
  const setTwoLocationEnabled = useCallback((enabled: boolean) => {
    if (enabled) {
      dispatchLocationFieldsState({
        type: 'setCount',
        count: 2,
      });
    } else {
      dispatchLocationFieldsState({
        type: 'setCount',
        count: 1,
      });
    }
  }, []);

  const handleStartDateTimeChange = useCallback(
    (newDateTime: DateTime | undefined) => {
      if (newDateTime) {
        setStartDateTime(newDateTime);
      } else {
        setStartDateTime(undefined);
      }
    },
    [],
  );

  const handleEndDateTimeChange = useCallback(
    (newDateTime: DateTime | undefined) => {
      if (newDateTime) {
        setEndDateTime(newDateTime);
      } else {
        setEndDateTime(undefined);
      }
    },
    [],
  );

  const handleStartTimeZoneChange = useCallback(
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

  const handleEndTimeZoneChange = useCallback(
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

  const handleSubmit = useCallback(() => {
    return async (elForm: HTMLFormElement) => {
      setErrorMessage('');
      // TIL: https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setCustomValidity
      // HTMLInputElement.setCustomValidity()
      // seems quite hard to use... need to call setCustomValidity again after invalid, before "submit" event
      if (!elForm.reportValidity()) {
        return;
      }
      const formData = new FormData(elForm);
      const title = (formData.get('title') as string | null) ?? '';
      const iconRaw = (formData.get('icon') as string | null) ?? '';
      const icon = iconRaw.trim();
      const description = (formData.get('description') as string | null) ?? '';
      const location = (formData.get('location') as string | null) ?? '';
      const locationDestination =
        (formData.get('locationDestination') as string | null) ?? '';
      const timeStartDate = startDateTime;
      const timeEndDate = endDateTime;
      const flags = updateActivityFlag(
        activityFlags,
        ActivityFlag.IsIdea,
        isIdea,
      );
      console.log('ActivityForm', {
        mode,
        activityId,
        description,
        location,
        locationDestination,
        tripId,
        title,
        icon,
        tripTimeZone,
        startTime: timeStartDate,
        endTime: timeEndDate,
        coordinateState: locationFieldsState,
        isIdea,
        flags,
      });
      if (!title) {
        return;
      }
      if (
        timeEndDate &&
        timeStartDate &&
        timeEndDate.diff(timeStartDate).as('minute') < 0
      ) {
        setErrorMessage('End time must be after start time');
        return;
      }
      // start time cannot be earlier than trip start time
      if (
        tripStartDateTime &&
        timeStartDate &&
        timeStartDate < tripStartDateTime
      ) {
        setErrorMessage('Start time cannot be earlier than trip start time');
        return;
      }
      // end time cannot be later than trip end time
      if (tripEndDateTime && timeEndDate && timeEndDate > tripEndDateTime) {
        setErrorMessage('End time cannot be later than trip end time');
        return;
      }
      if (mode === ActivityFormMode.Edit && activityId) {
        await dbUpdateActivity({
          id: activityId,
          title,
          icon: icon || null,
          description,
          location,
          locationLat: locationFieldsState.enabled[0]
            ? locationFieldsState.lat[0]
            : null,
          locationLng: locationFieldsState.enabled[0]
            ? locationFieldsState.lng[0]
            : null,
          locationZoom: locationFieldsState.enabled[0]
            ? locationFieldsState.zoom[0]
            : null,
          locationDestination:
            locationFieldsState.count === 2 ? locationDestination : null,
          locationDestinationLat:
            locationFieldsState.enabled[1] && locationFieldsState.count === 2
              ? locationFieldsState.lat[1]
              : null,
          locationDestinationLng:
            locationFieldsState.enabled[1] && locationFieldsState.count === 2
              ? locationFieldsState.lng[1]
              : null,
          locationDestinationZoom:
            locationFieldsState.enabled[1] && locationFieldsState.count === 2
              ? locationFieldsState.zoom[1]
              : null,

          timestampStart: timeStartDate ? timeStartDate.toMillis() : null,
          timestampEnd: timeEndDate ? timeEndDate.toMillis() : null,
          timeZoneStart: timeStartDate ? timeStartDate.zoneName : null,
          timeZoneEnd: timeEndDate ? timeEndDate.zoneName : null,
          flags: flags,
        });
        publishToast({
          root: {},
          title: { children: `Activity ${title} edited` },
          close: {},
        });
      } else if (mode === ActivityFormMode.New && tripId) {
        if (timeEndDate) {
          setTripLocalState(tripId, {
            activityTimestampStart: timeEndDate.toMillis(),
          });
        }
        await dbAddActivity(
          {
            title,
            icon: icon || null,
            description,
            location,
            locationLat: locationFieldsState.enabled[0]
              ? locationFieldsState.lat[0]
              : null,
            locationLng: locationFieldsState.enabled[0]
              ? locationFieldsState.lng[0]
              : null,
            locationZoom: locationFieldsState.enabled[0]
              ? locationFieldsState.zoom[0]
              : null,
            locationDestination,
            locationDestinationLat:
              locationFieldsState.enabled[1] && locationFieldsState.count === 2
                ? locationFieldsState.lat[1]
                : null,
            locationDestinationLng:
              locationFieldsState.enabled[1] && locationFieldsState.count === 2
                ? locationFieldsState.lng[1]
                : null,
            locationDestinationZoom:
              locationFieldsState.enabled[1] && locationFieldsState.count === 2
                ? locationFieldsState.zoom[1]
                : null,
            timestampStart: timeStartDate ? timeStartDate.toMillis() : null,
            timestampEnd: timeEndDate ? timeEndDate.toMillis() : null,
            timeZoneStart: timeStartDate ? timeStartDate.zoneName : null,
            timeZoneEnd: timeEndDate ? timeEndDate.zoneName : null,
            flags: flags,
          },
          {
            tripId: tripId,
          },
        );
        publishToast({
          root: {},
          title: { children: `Activity ${title} added` },
          close: {},
        });
      }

      elForm.reset();
      onFormSuccess();
    };
  }, [
    activityId,
    endDateTime,
    locationFieldsState,
    mode,
    onFormSuccess,
    publishToast,
    startDateTime,
    isIdea,
    tripId,
    tripTimeZone,
    tripStartDateTime,
    tripEndDateTime,
    setTripLocalState,
    activityFlags,
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
          Activity name{' '}
          <Text weight="light" size="1">
            (required)
          </Text>
        </Text>
        <EmojiTextField
          defaultValue={activityTitle}
          placeholder="Enter activity name"
          name="title"
          id={idTitle}
          iconName="icon"
          defaultIcon={activityIcon}
          required
          clearable
        />
        <Text as="label" htmlFor={idIsIdea}>
          Is this activity an idea?{' '}
          <Text weight="light" size="1">
            (if yes, will appear in activity idea list)
          </Text>
        </Text>
        <Switch
          name="isIdea"
          id={idIsIdea}
          checked={isIdea}
          onCheckedChange={setIsIdea}
        />

        <Text as="label" htmlFor={idTwoLocationEnabled}>
          Set two locations (origin & destination)?
        </Text>
        <Switch
          name="twoLocationEnabled"
          id={idTwoLocationEnabled}
          checked={locationFieldsState.count === 2}
          onCheckedChange={setTwoLocationEnabled}
        />
        <Text as="label" htmlFor={idLocation}>
          {locationFieldsState.count === 2 ? 'Origin' : 'Location'}
        </Text>
        <TextArea
          defaultValue={activityLocation}
          placeholder="Enter location name"
          name="location"
          id={idLocation}
          style={{ minHeight: 40 }}
        />
        <Text as="label" htmlFor={idCoordinates}>
          Set{locationFieldsState.count === 2 ? ' origin' : null} location
          coordinates
        </Text>
        <Switch
          name="coordinatesEnabled"
          id={idCoordinates}
          checked={locationFieldsState.enabled[0]}
          onCheckedChange={setCoordinateEnabled}
        />
        {locationFieldsState.enabled[0] ? (
          <ActivityMap
            mapOptions={{
              lng: locationFieldsState.lng[0] ?? 0,
              lat: locationFieldsState.lat[0] ?? 0,
              zoom: locationFieldsState.zoom[0] ?? 9,
              region: tripRegion,
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

        {locationFieldsState.count === 2 ? (
          <>
            {' '}
            <Text as="label" htmlFor={idLocation}>
              Destination
            </Text>
            <TextArea
              defaultValue={activityLocationDestination ?? ''}
              placeholder="Enter destination location name"
              name="locationDestination"
              id={idLocationDestination}
              style={{ minHeight: 40 }}
            />
            <Text as="label" htmlFor={idCoordinates}>
              Set destination location coordinates
            </Text>
            <Switch
              name="coordinatesDestinationEnabled"
              id={idCoordinatesDestination}
              checked={locationFieldsState.enabled[1]}
              onCheckedChange={setCoordinateEnabledForDestination}
            />
            {locationFieldsState.enabled[1] ? (
              <ActivityMap
                mapOptions={{
                  lng: locationFieldsState.lng[1] ?? 0,
                  lat: locationFieldsState.lat[1] ?? 0,
                  zoom: locationFieldsState.zoom[1] ?? 9,
                  region: tripRegion,
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
          </>
        ) : null}

        <Text as="label">Date & time</Text>
        <DateTimeRangePicker
          startDateTime={startDateTime}
          endDateTime={endDateTime}
          startTimeZone={startTimeZone}
          endTimeZone={endTimeZone}
          defaultTimeZone={tripTimeZone}
          min={tripStartDateTime?.minus({ days: 1 })}
          max={tripEndDateTime?.plus({ days: 1 })}
          onStartDateTimeChange={handleStartDateTimeChange}
          onEndDateTimeChange={handleEndDateTimeChange}
          onStartTimeZoneChange={handleStartTimeZoneChange}
          onEndTimeZoneChange={handleEndTimeZoneChange}
        />
        <Text as="label" htmlFor={idDescription}>
          Description
        </Text>
        <TextArea
          defaultValue={activityDescription}
          placeholder="Enter description"
          name="description"
          id={idDescription}
          style={{ minHeight: 240 }}
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
