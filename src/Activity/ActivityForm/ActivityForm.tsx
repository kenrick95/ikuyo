import {
  Button,
  Flex,
  Switch,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes';
import type { DateTime } from 'luxon';
import { useCallback, useId, useReducer, useState } from 'react';
import { DateTimePicker } from '../../common/DatePicker2/DateTimePicker';
import { DateTimePickerMode } from '../../common/DatePicker2/DateTimePickerMode';
import { dangerToken } from '../../common/ui';
import { useBoundStore } from '../../data/store';
import { ActivityMap } from '../ActivityDialog/ActivityDialogMap';
import { setNewActivityTimestamp } from '../activityStorage';
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

  onFormSuccess: () => void;
  onFormCancel: () => void;
}) {
  const idForm = useId();
  const idTitle = useId();
  const idTimeStart = useId();
  const idTimeEnd = useId();
  const idLocation = useId();
  const idTwoLocationEnabled = useId();
  const idLocationDestination = useId();
  const idCoordinatesDestination = useId();

  const idDescription = useId();
  const idCoordinates = useId();
  const publishToast = useBoundStore((state) => state.publishToast);
  const [errorMessage, setErrorMessage] = useState('');

  // State for DateTime pickers
  const [startDateTime, setStartDateTime] = useState<DateTime | undefined>(
    activityStartDateTime,
  );
  const [endDateTime, setEndDateTime] = useState<DateTime | undefined>(
    activityEndDateTime,
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
      const description = (formData.get('description') as string | null) ?? '';
      const location = (formData.get('location') as string | null) ?? '';
      const locationDestination =
        (formData.get('locationDestination') as string | null) ?? '';
      const timeStartDate = startDateTime;
      const timeEndDate = endDateTime;
      console.log('ActivityForm', {
        mode,
        activityId,
        description,
        location,
        locationDestination,
        tripId,
        title,
        tripTimeZone,
        startTime: timeStartDate,
        endTime: timeEndDate,
        coordinateState: locationFieldsState,
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
      // TODO: remove this validation when timetable support showing activities spanning more than 1 day
      if (
        timeEndDate &&
        timeStartDate &&
        !timeEndDate.hasSame(timeStartDate, 'day')
      ) {
        setErrorMessage('Activity must occur on same day');
        return;
      }
      if (mode === ActivityFormMode.Edit && activityId) {
        await dbUpdateActivity({
          id: activityId,
          title,
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
        });
        publishToast({
          root: {},
          title: { children: `Activity ${title} edited` },
          close: {},
        });
      } else if (mode === ActivityFormMode.New && tripId) {
        if (timeEndDate) {
          setNewActivityTimestamp({
            timestamp: timeEndDate.toMillis(),
            tripId: tripId,
          });
        }
        await dbAddActivity(
          {
            title,
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
    tripId,
    tripTimeZone,
  ]);

  return (
    <form
      id={idForm}
      onInput={() => {
        setErrorMessage('');
      }}
      onSubmit={(e) => {
        e.preventDefault();
        const elForm = e.currentTarget;
        void handleSubmit()(elForm);
      }}
    >
      <Flex direction="column" gap="2">
        <Text color={dangerToken} size="2">
          {errorMessage}&nbsp;
        </Text>
        <Text as="label" htmlFor={idTitle}>
          Activity name{' '}
          <Text weight="light" size="1">
            (required)
          </Text>
        </Text>
        <TextField.Root
          defaultValue={activityTitle}
          placeholder="Enter activity name"
          name="title"
          type="text"
          id={idTitle}
          required
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

        <Text as="label" htmlFor={idTimeStart}>
          Start time{' '}
          <Text weight="light" size="1">
            (in {tripTimeZone} time zone)
          </Text>
        </Text>
        <DateTimePicker
          name="startTime"
          mode={DateTimePickerMode.DateTime}
          min={tripStartDateTime}
          max={tripEndDateTime}
          value={startDateTime}
          onChange={setStartDateTime}
          clearable={true}
        />
        <Text as="label" htmlFor={idTimeEnd}>
          End time{' '}
          <Text weight="light" size="1">
            (in {tripTimeZone} time zone)
          </Text>
        </Text>
        <DateTimePicker
          name="endTime"
          mode={DateTimePickerMode.DateTime}
          min={tripStartDateTime}
          max={tripEndDateTime}
          value={endDateTime}
          onChange={setEndDateTime}
          clearable={true}
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
