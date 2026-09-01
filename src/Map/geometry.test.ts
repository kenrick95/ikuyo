import { describe, expect, test } from 'vitest';
import { type Line, RouteType } from './constants';
import { calculateArrowRotation, createGeoJsonData } from './geometry';

const from = { lat: 1.3521, lng: 103.8198 };
const to = { lat: 35.6762, lng: 139.6503 };

function makeLine(id: string, type: Line['type'] = RouteType.Activity): Line {
  return { id, from, to, type };
}

describe('createGeoJsonData', () => {
  test('rotates arrows clockwise from the east-facing glyph', () => {
    expect(calculateArrowRotation([0, 0], [1, 0])).toBe(0);
    expect(calculateArrowRotation([0, 0], [0, 1])).toBe(-90);
    expect(calculateArrowRotation([0, 0], [0, -1])).toBe(90);
    expect(Math.abs(calculateArrowRotation([0, 0], [-1, 0]))).toBe(180);
  });

  test('preserves route types and adds destination-side arrows', () => {
    const data = createGeoJsonData([
      makeLine('activity', RouteType.Activity),
      makeLine('flight', RouteType.Flight),
      makeLine('train', RouteType.Train),
    ]);

    expect(data.features).toHaveLength(6);
    expect(
      data.features.map((feature) => feature.properties?.routeType),
    ).toEqual([
      RouteType.Activity,
      RouteType.Activity,
      RouteType.Flight,
      RouteType.Flight,
      RouteType.Train,
      RouteType.Train,
    ]);

    const arrow = data.features[1].geometry;
    expect(arrow.type).toBe('Point');
    if (arrow.type === 'Point') {
      expect(arrow.coordinates).not.toEqual([to.lng, to.lat]);
      expect(arrow.coordinates[0]).toBeGreaterThan(from.lng);
      expect(arrow.coordinates[0]).toBeLessThan(to.lng);
    }
  });

  test('fans out routes with the same endpoints into separate curves', () => {
    const data = createGeoJsonData([
      makeLine('a'),
      makeLine('b'),
      makeLine('c'),
    ]);
    const lines = data.features
      .map((feature) => {
        if (feature.geometry.type !== 'LineString') return null;
        return feature.geometry;
      })
      .filter((geometry) => geometry !== null);

    expect(lines).toHaveLength(3);
    expect(lines.map((line) => line.coordinates[25])).toEqual([
      expect.any(Array),
      expect.any(Array),
      expect.any(Array),
    ]);
    expect(new Set(lines.map((line) => line.coordinates[25][1])).size).toBe(3);
  });
});
