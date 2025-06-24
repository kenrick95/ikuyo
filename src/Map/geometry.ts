import type { Line } from './constants';

export function createGeoJsonData(allLines: Line[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: allLines.map((line) =>
      createLineGeoJSON(
        { lng: line.from.lng, lat: line.from.lat },
        { lng: line.to.lng, lat: line.to.lat },
      ),
    ),
  };
}
function createLineGeoJSON(
  from: { lng: number; lat: number },
  to: { lng: number; lat: number },
) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ] as [number, number][],
    },
  };
}
