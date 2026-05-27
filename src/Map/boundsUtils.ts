import type { MarkerLocation } from './constants';

/**
 * Filters locations for bounds calculation using the IQR method to exclude
 * outliers (e.g. flight origins/destinations far outside the trip area).
 * All locations are still shown as markers — only bounds are affected.
 *
 * Requires at least 4 points for IQR to be meaningful; otherwise returns
 * all locations unchanged.
 */
export function filterOutliersForBounds(
  locations: MarkerLocation[],
): MarkerLocation[] {
  if (locations.length < 4) return locations;

  const sortedLats = locations.map((p) => p.lat).sort((a, b) => a - b);
  const sortedLngs = locations.map((p) => p.lng).sort((a, b) => a - b);

  const q1Lat = sortedLats[Math.floor(sortedLats.length * 0.25)];
  const q3Lat = sortedLats[Math.floor(sortedLats.length * 0.75)];
  const iqrLat = q3Lat - q1Lat;

  const q1Lng = sortedLngs[Math.floor(sortedLngs.length * 0.25)];
  const q3Lng = sortedLngs[Math.floor(sortedLngs.length * 0.75)];
  const iqrLng = q3Lng - q1Lng;

  const filtered = locations.filter(
    (p) =>
      p.lat >= q1Lat - 1.5 * iqrLat &&
      p.lat <= q3Lat + 1.5 * iqrLat &&
      p.lng >= q1Lng - 1.5 * iqrLng &&
      p.lng <= q3Lng + 1.5 * iqrLng,
  );

  return filtered.length > 0 ? filtered : locations;
}
