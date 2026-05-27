import { describe, expect, test } from 'vitest';
import { filterOutliersForBounds } from './boundsUtils';
import type { MarkerLocation } from './constants';
import { LocationType } from './constants';

function makeActivity(lat: number, lng: number): MarkerLocation {
  return {
    type: LocationType.Activity,
    id: 'test',
    lat,
    lng,
    isToday: false,
    customIcon: null,
  };
}

describe('filterOutliersForBounds', () => {
  test('returns all locations unchanged when fewer than 4 points', () => {
    const locations = [makeActivity(35, 139), makeActivity(36, 140)];
    expect(filterOutliersForBounds(locations)).toEqual(locations);
  });

  test('returns all locations unchanged when exactly 3 points', () => {
    const locations = [
      makeActivity(35, 139),
      makeActivity(36, 140),
      makeActivity(37, 141),
    ];
    expect(filterOutliersForBounds(locations)).toEqual(locations);
  });

  test('returns all locations unchanged when no outliers present', () => {
    const locations = [
      makeActivity(35.6, 139.7), // Tokyo
      makeActivity(34.6, 135.5), // Osaka
      makeActivity(35.0, 135.7), // Kyoto
      makeActivity(33.6, 130.4), // Fukuoka
    ];
    expect(filterOutliersForBounds(locations)).toEqual(locations);
  });

  test('removes a distant outlier from bounds calculation', () => {
    const cluster = [
      makeActivity(35.6, 139.7), // Tokyo
      makeActivity(34.6, 135.5), // Osaka
      makeActivity(35.0, 135.7), // Kyoto
      makeActivity(33.6, 130.4), // Fukuoka
      makeActivity(35.2, 136.9), // Nagoya
    ];
    // A flight origin far away (e.g. New York)
    const outlier = makeActivity(40.7, -74.0);
    const result = filterOutliersForBounds([...cluster, outlier]);
    expect(result).not.toContainEqual(outlier);
    expect(result.length).toBe(cluster.length);
  });

  test('removes distant outliers at both ends (flight origin and destination)', () => {
    const cluster = [
      makeActivity(35.6, 139.7), // Tokyo
      makeActivity(34.6, 135.5), // Osaka
      makeActivity(35.0, 135.7), // Kyoto
      makeActivity(33.6, 130.4), // Fukuoka
      makeActivity(35.2, 136.9), // Nagoya
    ];
    const flightOrigin = makeActivity(51.5, -0.1); // London
    const flightDest = makeActivity(1.35, 103.8); // Singapore
    const result = filterOutliersForBounds([
      flightOrigin,
      ...cluster,
      flightDest,
    ]);
    expect(result).not.toContainEqual(flightOrigin);
    expect(result).not.toContainEqual(flightDest);
    expect(result.length).toBe(cluster.length);
  });

  test('falls back to all locations if filtering would produce empty result', () => {
    // All points are identical — IQR is 0, but no point is outside the range
    const locations = [
      makeActivity(35.6, 139.7),
      makeActivity(35.6, 139.7),
      makeActivity(35.6, 139.7),
      makeActivity(35.6, 139.7),
    ];
    const result = filterOutliersForBounds(locations);
    expect(result.length).toBe(locations.length);
  });

  test('preserves location objects by reference', () => {
    const cluster = [
      makeActivity(35.6, 139.7),
      makeActivity(34.6, 135.5),
      makeActivity(35.0, 135.7),
      makeActivity(33.6, 130.4),
      makeActivity(35.2, 136.9),
    ];
    const outlier = makeActivity(90.0, 180.0);
    const input = [...cluster, outlier];
    const result = filterOutliersForBounds(input);
    for (const loc of result) {
      expect(input).toContain(loc); // same reference, not a copy
    }
  });
});
