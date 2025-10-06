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
import { TimeZoneSelect } from '../../common/TimeZoneSelect/TimeZoneSelect';
import { dangerToken } from '../../common/ui';
import { useBoundStore } from '../../data/store';
import { AccommodationMap } from '../AccommodationDialog/AccommodationDialogMap';
import { dbAddAccommodation, dbUpdateAccommodation } from '../db';
import { geocodingRequest } from './AccommodationFormGeocoding';
import {
  AccommodationFormMode,
  type AccommodationFormModeType,
} from './AccommodationFormMode';

interface LocationCoordinateState {
  enabled: boolean;
  lat: number | null | undefined;
  lng: number | null | undefined;
  zoom: number | null | undefined;
}

function coordinateStateReducer(
  state: LocationCoordinateState,
  action:
    | { type: 'setMapZoom'; zoom: number }
    | { type: 'setMarkerCoordinate'; lat: number; lng: number }
    | {
        type: 'setEnabled';
        lat: number | null | undefined;
        lng: number | null | undefined;
        zoom: number | null | undefined;
      }
    | {
        type: 'setDisabled';
      },
): LocationCoordinateState {
  switch (action.type) {
    case 'setEnabled':
      return {
        ...state,
        lat: action.lat,
        lng: action.lng,
        zoom: action.zoom,
        enabled: true,
      };
    case 'setDisabled':
      return {
        ...state,
        enabled: false,
      };
    case 'setMapZoom':
      return {
        ...state,
        zoom: action.zoom,
      };
    case 'setMarkerCoordinate':
      return {
        ...state,
        lat: action.lat,
        lng: action.lng,
      };
    default:
      return state;
  }
}

export function AccommodationForm({
  mode,
  accommodationId,
  tripId,

  tripTimeZone,
  tripStartDateTime,
  tripEndDateTime,
  tripRegion,

  accommodationName,
  accommodationAddress,
  accommodationCheckInDateTime,
  accommodationCheckOutDateTime,
  accommodationPhoneNumber,
  accommodationNotes,
  accommodationLocationLat,
  accommodationLocationLng,
  accommodationLocationZoom,
  onFormSuccess,
  onFormCancel,
}: {
  mode: AccommodationFormModeType;

  tripId?: string;
  accommodationId?: string;

  tripTimeZone: string;
  tripStartDateTime: DateTime | undefined;
  tripEndDateTime: DateTime | undefined;
  tripRegion: string;

  accommodationName: string;
  accommodationAddress: string;
  accommodationCheckInDateTime: DateTime | undefined;
  accommodationCheckOutDateTime: DateTime | undefined;
  accommodationPhoneNumber: string;
  accommodationNotes: string;
  accommodationLocationLat: number | null | undefined;
  accommodationLocationLng: number | null | undefined;
  accommodationLocationZoom: number | null | undefined;

  onFormSuccess: () => void;
  onFormCancel: () => void;
}) {
  const idName = useId();
  const idAddress = useId();
  const idPhoneNumber = useId();
  const idNotes = useId();
  const idCoordinates = useId();
  const publishToast = useBoundStore((state) => state.publishToast);

  const [errorMessage, setErrorMessage] = useState('');
  const [checkInDateTime, setCheckInDateTime] = useState<DateTime | undefined>(
    accommodationCheckInDateTime,
  );
  const [checkOutDateTime, setCheckOutDateTime] = useState<
    DateTime | undefined
  >(accommodationCheckOutDateTime);

  // Handlers for date changes
  const handleCheckInDateChange = useCallback(
    (dateTime: DateTime | undefined) => {
      setCheckInDateTime(dateTime);
      setErrorMessage(''); // Clear any date-related errors
    },
    [],
  );

  const handleCheckOutDateChange = useCallback(
    (dateTime: DateTime | undefined) => {
      setCheckOutDateTime(dateTime);
      setErrorMessage(''); // Clear any date-related errors
    },
    [],
  );

  const [coordinateState, dispatchCoordinateState] = useReducer(
    coordinateStateReducer,
    {
      enabled:
        accommodationLocationLat != null && accommodationLocationLng != null,
      lat: accommodationLocationLat,
      lng: accommodationLocationLng,
      zoom: accommodationLocationZoom ?? 9,
    },
  );

  const setCoordinateEnabled = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        if (coordinateState.lat && coordinateState.lng) {
          dispatchCoordinateState({
            type: 'setEnabled',
            lat: coordinateState.lat,
            lng: coordinateState.lng,
            zoom: coordinateState.zoom,
          });
        } else {
          // if coordinates are not set, use geocoding from address to get the coordinates
          const elAddress = document.getElementById(
            idAddress,
          ) as HTMLInputElement;
          const address = elAddress.value;
          const [lng, lat, zoom] = await geocodingRequest(address, tripRegion);
          dispatchCoordinateState({
            type: 'setEnabled',
            lat: lat,
            lng: lng,
            zoom: zoom ?? coordinateState.zoom,
          });
        }
      } else {
        dispatchCoordinateState({
          type: 'setDisabled',
        });
      }
    },
    [
      idAddress,
      tripRegion,
      coordinateState.lat,
      coordinateState.lng,
      coordinateState.zoom,
    ],
  );

  const setMarkerCoordinate = useCallback(
    async (coordinate: { lng: number; lat: number }) => {
      dispatchCoordinateState({
        type: 'setMarkerCoordinate',
        lat: coordinate.lat,
        lng: coordinate.lng,
      });
    },
    [],
  );

  const setMapZoom = useCallback(async (zoom: number) => {
    dispatchCoordinateState({
      type: 'setMapZoom',
      zoom: zoom,
    });
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
      const name = (formData.get('name') as string | null) ?? '';
      const address = (formData.get('address') as string | null) ?? '';
      const phoneNumber = (formData.get('phoneNumber') as string | null) ?? '';
      const notes = (formData.get('notes') as string | null) ?? '';
      const timeCheckInDate = checkInDateTime;
      const timeCheckOutDate = checkOutDateTime;
      console.log('AccommodationForm', {
        mode,
        accommodationId,
        tripId,
        name,
        address,
        phoneNumber,
        notes,
        timeCheckInDate,
        timeCheckOutDate,
        coordinateState,
      });
      if (!name || !timeCheckInDate || !timeCheckOutDate) {
        return;
      }
      if (timeCheckOutDate.diff(timeCheckInDate).as('minute') < 0) {
        setErrorMessage('Check out time must be after check in time');
        return;
      }
      // check in time cannot be earlier than trip start time
      if (tripStartDateTime && timeCheckInDate < tripStartDateTime) {
        setErrorMessage('Check in time cannot be earlier than trip start time');
        return;
      }
      // check out time cannot be later than trip end time
      if (tripEndDateTime && timeCheckOutDate > tripEndDateTime) {
        setErrorMessage('Check out time cannot be later than trip end time');
        return;
      }
      if (mode === AccommodationFormMode.Edit && accommodationId) {
        await dbUpdateAccommodation({
          id: accommodationId,
          name,
          address,
          timestampCheckIn: timeCheckInDate.toMillis(),
          timestampCheckOut: timeCheckOutDate.toMillis(),
          timeZoneCheckIn: timeCheckInDate.zoneName,
          timeZoneCheckOut: timeCheckOutDate.zoneName,
          phoneNumber,
          notes,
          locationLat: coordinateState.enabled ? coordinateState.lat : null,
          locationLng: coordinateState.enabled ? coordinateState.lng : null,
          locationZoom: coordinateState.enabled ? coordinateState.zoom : null,
        });
        publishToast({
          root: {},
          title: { children: `Accommodation ${name} updated` },
          close: {},
        });
      } else if (mode === AccommodationFormMode.New && tripId) {
        const { id, result } = await dbAddAccommodation(
          {
            name,
            address,
            timestampCheckIn: timeCheckInDate.toMillis(),
            timestampCheckOut: timeCheckOutDate.toMillis(),
            timeZoneCheckIn: timeCheckInDate.zoneName,
            timeZoneCheckOut: timeCheckOutDate.zoneName,
            phoneNumber,
            notes,
            locationLat: coordinateState.enabled ? coordinateState.lat : null,
            locationLng: coordinateState.enabled ? coordinateState.lng : null,
            locationZoom: coordinateState.enabled ? coordinateState.zoom : null,
          },
          {
            tripId: tripId,
          },
        );
        console.log('AccommodationForm: dbAddAccommodation', { id, result });
        publishToast({
          root: {},
          title: { children: `Accommodation ${name} added` },
          close: {},
        });
      }

      elForm.reset();
      onFormSuccess();
    };
  }, [
    accommodationId,
    mode,
    publishToast,
    onFormSuccess,
    tripId,
    tripEndDateTime,
    tripStartDateTime,
    coordinateState,
    checkInDateTime,
    checkOutDateTime,
  ]);

  const handleTimeZoneCheckInChange = useCallback(
    (newTimeZone: string) => {
      if (checkInDateTime) {
        setCheckInDateTime(
          checkInDateTime.setZone(newTimeZone, { keepLocalTime: true }),
        );
      }
    },
    [checkInDateTime],
  );
  const handleTimeZoneCheckOutChange = useCallback(
    (newTimeZone: string) => {
      if (checkOutDateTime) {
        setCheckOutDateTime(
          checkOutDateTime.setZone(newTimeZone, { keepLocalTime: true }),
        );
      }
    },
    [checkOutDateTime],
  );

  return (
    <form
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
        <Text as="label" htmlFor={idName}>
          Accommodation name{' '}
          <Text weight="light" size="1">
            (required)
          </Text>
        </Text>
        <TextField.Root
          defaultValue={accommodationName}
          placeholder="Enter accommodation name (e.g. Hotel California, etc.)"
          name="name"
          type="text"
          id={idName}
          required
        />
        <Text as="label" htmlFor={idAddress}>
          Address
        </Text>
        <TextArea
          defaultValue={accommodationAddress}
          placeholder="Enter accommodation address"
          name="address"
          id={idAddress}
          style={{ minHeight: 80 }}
        />
        <Text as="label" htmlFor={idCoordinates}>
          Set location coordinates
        </Text>
        <Switch
          name="coordinatesEnabled"
          id={idCoordinates}
          checked={coordinateState.enabled}
          onCheckedChange={setCoordinateEnabled}
        />
        {coordinateState.enabled ? (
          <AccommodationMap
            mapOptions={{
              lng: coordinateState.lng ?? 0,
              lat: coordinateState.lat ?? 0,
              zoom: coordinateState.zoom ?? 9,
              region: tripRegion,
            }}
            marker={
              coordinateState.lng != null && coordinateState.lat != null
                ? {
                    lng: coordinateState.lng,
                    lat: coordinateState.lat,
                  }
                : undefined
            }
            setMarkerCoordinate={setMarkerCoordinate}
            setMapZoom={setMapZoom}
          />
        ) : null}
        <Text as="label">
          Check in time zone{' '}
          <Text weight="light" size="1">
            (required; trip default time zone is {tripTimeZone})
          </Text>
        </Text>
        <TimeZoneSelect
          id="timeZoneCheckIn"
          name="timeZoneCheckIn"
          value={checkInDateTime?.zoneName ?? tripTimeZone}
          handleChange={handleTimeZoneCheckInChange}
          isFormLoading={false}
        />
        <Text as="label">
          Check in time{' '}
          <Text weight="light" size="1">
            (required; in {checkInDateTime?.zoneName ?? tripTimeZone} time zone)
          </Text>
        </Text>
        <DateTimePicker
          value={checkInDateTime}
          onChange={handleCheckInDateChange}
          mode={DateTimePickerMode.DateTime}
          name="timeCheckIn"
          required
          aria-label="Accommodation check in time"
          placeholder="Select check in time"
          min={tripStartDateTime}
          max={tripEndDateTime}
        />
        <Text as="label">
          Check out time zone{' '}
          <Text weight="light" size="1">
            (required; trip default time zone is {tripTimeZone})
          </Text>
        </Text>
        <TimeZoneSelect
          id="timeZoneCheckOut"
          name="timeZoneCheckOut"
          value={checkOutDateTime?.zoneName ?? tripTimeZone}
          handleChange={handleTimeZoneCheckOutChange}
          isFormLoading={false}
        />
        <Text as="label">
          Check out time{' '}
          <Text weight="light" size="1">
            (required; in {checkOutDateTime?.zoneName ?? tripTimeZone} time
            zone)
          </Text>
        </Text>
        <DateTimePicker
          value={checkOutDateTime}
          onChange={handleCheckOutDateChange}
          mode={DateTimePickerMode.DateTime}
          name="timeCheckOut"
          required
          aria-label="Accommodation check out time"
          placeholder="Select check out time"
          min={tripStartDateTime}
          max={tripEndDateTime}
        />
        <Text as="label" htmlFor={idPhoneNumber}>
          Phone number
        </Text>
        <TextField.Root
          defaultValue={accommodationPhoneNumber}
          placeholder="Enter accommodation's phone number"
          name="phoneNumber"
          id={idPhoneNumber}
          type="tel"
        />
        <Text as="label" htmlFor={idNotes}>
          Notes
        </Text>
        <TextArea
          defaultValue={accommodationNotes}
          placeholder="Any notes on the accommodation?"
          name="notes"
          id={idNotes}
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
