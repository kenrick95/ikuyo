import { LocationType, type MarkerLocation } from './constants';

export function createMarkerElement(location: MarkerLocation): HTMLDivElement {
  const markerElement = document.createElement('div');
  markerElement.style.width = '24px';
  markerElement.style.height = '24px';
  markerElement.style.borderRadius = '50%';
  markerElement.style.display = 'flex';
  markerElement.style.alignItems = 'center';
  markerElement.style.justifyContent = 'center';
  markerElement.style.fontSize = '12px';
  markerElement.style.color = 'white';
  markerElement.style.cursor = 'pointer';
  markerElement.style.border = `1px solid var(--grey-9)`;
  markerElement.style.boxShadow = 'var(--shadow-2)';

  if (location.type === LocationType.Accommodation) {
    markerElement.style.backgroundColor = 'var(--accent-surface)';
    markerElement.innerHTML = '🏨';
  } else if (location.type === LocationType.Activity) {
    markerElement.style.backgroundColor = 'var(--accent-surface)';
    markerElement.innerHTML = '📍';
  } else if (location.type === LocationType.ActivityDestination) {
    markerElement.style.backgroundColor = 'var(--accent-surface)';
    markerElement.innerHTML = '🎯';
  }
  return markerElement;
}
