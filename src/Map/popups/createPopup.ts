import { config as mapTilerConfig, Popup } from '@maptiler/sdk';

mapTilerConfig.session = false;

import {
  LocationType,
  type MarkerLocation,
  type PopupPortal,
} from '../constants';

export function createPopup(
  location: MarkerLocation,
  className: string,
): [Popup, PopupPortal] {
  const popupContent = document.createElement('div');
  const popup = new Popup({
    closeButton: false,
    closeOnClick: true,
    offset: 25,
    className,
  }).setDOMContent(popupContent);

  if (location.type === LocationType.Accommodation) {
    return [
      popup,
      {
        type: LocationType.Accommodation,
        accommodationId: location.id,
        popup: popupContent,
      },
    ];
  } else if (
    location.type === LocationType.Activity ||
    location.type === LocationType.ActivityDestination
  ) {
    return [
      popup,
      {
        type: location.type,
        activityId: location.id,
        popup: popupContent,
      },
    ];
  }
  // Never
  return [
    popup,
    { type: LocationType.Activity, activityId: '', popup: popupContent },
  ];
}
