import {
  Button,
  Flex,
  Switch,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes';
import { useCallback, useId, useReducer, useState } from 'react';
import { dangerToken } from '../../common/ui';
import { useBoundStore } from '../../data/store';
import { AccommodationMap } from '../AccommodationDialog/AccommodationDialogMap';
import { dbAddAccommodation, dbUpdateAccommodation } from '../db';
import { getDateTimeFromDatetimeLocalInput } from '../time';
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
  tripStartStr,
  tripEndStr,
  tripRegion,

  accommodationName,
  accommodationAddress,
  accommodationCheckInStr,
  accommodationCheckOutStr,
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
  tripStartStr: string;
  tripEndStr: string;
  tripRegion: string;

  accommodationName: string;
  accommodationAddress: string;
  accommodationCheckInStr: string;
  accommodationCheckOutStr: string;
  accommodationPhoneNumber: string;
  accommodationNotes: string;
  accommodationLocationLat: number | null | undefined;
  accommodationLocationLng: number | null | undefined;
  accommodationLocationZoom: number | null | undefined;

  onFormSuccess: () => void;
  onFormCancel: () => void;
}) {
  const idName = useId();
  const idTimeCheckIn = useId();
  const idTimeCheckOut = useId();
  const idAddress = useId();
  const idPhoneNumber = useId();
  const idNotes = useId();
  const idCoordinates = useId();
  const publishToast = useBoundStore((state) => state.publishToast);

  const [errorMessage, setErrorMessage] = useState('');

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

  console.log('coordinateState', coordinateState);

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
      const timeCheckInString =
        (formData.get('timeCheckIn') as string | null) ?? '';
      const timeCheckOutString =
        (formData.get('timeCheckOut') as string | null) ?? '';
      const timeCheckInDate = getDateTimeFromDatetimeLocalInput(
        timeCheckInString,
        tripTimeZone,
      );
      const timeCheckOutDate = getDateTimeFromDatetimeLocalInput(
        timeCheckOutString,
        tripTimeZone,
      );
      console.log('AccommodationForm', {
        mode,
        accommodationId,
        tripId,
        name,
        address,
        phoneNumber,
        notes,
        timeCheckInString,
        timeCheckOutString,
        timeCheckInDate,
        timeCheckOutDate,
        coordinateState,
      });
      if (!name || !timeCheckInString || !timeCheckOutString) {
        return;
      }
      if (timeCheckOutDate.diff(timeCheckInDate).as('minute') < 0) {
        setErrorMessage('Check out time must be after check in time');
        return;
      }
      if (mode === AccommodationFormMode.Edit && accommodationId) {
        await dbUpdateAccommodation({
          id: accommodationId,
          name,
          address,
          timestampCheckIn: timeCheckInDate.toMillis(),
          timestampCheckOut: timeCheckOutDate.toMillis(),
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
    tripTimeZone,
    coordinateState,
  ]);

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
        <Text color={dangerToken} size="2">
          {errorMessage}&nbsp;
        </Text>
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
        <Text as="label" htmlFor={idTimeCheckIn}>
          Check in time{' '}
          <Text weight="light" size="1">
            (required; in {tripTimeZone} time zone)
          </Text>
        </Text>
        <TextField.Root
          id={idTimeCheckIn}
          name="timeCheckIn"
          type="datetime-local"
          min={tripStartStr}
          max={tripEndStr}
          defaultValue={accommodationCheckInStr}
          required
        />
        <Text as="label" htmlFor={idTimeCheckOut}>
          Check out time{' '}
          <Text weight="light" size="1">
            (required; in {tripTimeZone} time zone)
          </Text>
        </Text>
        <TextField.Root
          id={idTimeCheckOut}
          name="timeCheckOut"
          type="datetime-local"
          min={tripStartStr}
          max={tripEndStr}
          defaultValue={accommodationCheckOutStr}
          required
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
