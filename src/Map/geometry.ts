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
export function createLineGeoJSON(
  from: { lng: number; lat: number },
  to: { lng: number; lat: number },
) {
  const curveFactor = 0.05;
  const controlPoint = calculateCurveControlPoint(from, to, curveFactor);
  const coordinates = buildCurvePolyline(from, to, controlPoint, 50);
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: coordinates.map((point) => [point.lng, point.lat]),
    },
  };
}

/**
 * Convert to a control point for a quadratic Bezier curve between two points. The control point is calculated to be perpendicular to the line segment connecting the two points, and its distance from the midpoint of the segment is proportional to the distance between the two points, scaled by the provided factor.
 *
 * This is so to avoid overlapping straight lines especially for activities that are like A to B and then B to A.
 * @param from
 * @param to
 * @param factor Adjust this factor to control the curvature of the lines. A higher value will result in a more pronounced curve
 * @returns
 */
function calculateCurveControlPoint(
  from: { lng: number; lat: number },
  to: { lng: number; lat: number },
  factor: number,
): { lng: number; lat: number } {
  const deltaLng = to.lng - from.lng;
  const deltaLat = to.lat - from.lat;
  const distance = Math.sqrt(deltaLng * deltaLng + deltaLat * deltaLat);
  if (distance === 0) {
    return {
      lng: (from.lng + to.lng) / 2,
      lat: (from.lat + to.lat) / 2,
    };
  }
  // Perpendicular unit vector, offset proportional to the distance so the
  // curve stays visible regardless of line length.
  const perpLng = -deltaLat / distance;
  const perpLat = deltaLng / distance;
  const midLng = (from.lng + to.lng) / 2;
  const midLat = (from.lat + to.lat) / 2;
  return {
    lng: midLng + perpLng * distance * factor,
    lat: midLat + perpLat * distance * factor,
  };
}

function buildCurvePolyline(
  from: { lng: number; lat: number },
  to: { lng: number; lat: number },
  control: { lng: number; lat: number },
  segments: number,
): { lng: number; lat: number }[] {
  const points: { lng: number; lat: number }[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const invT = 1 - t;
    const lng =
      invT * invT * from.lng + 2 * invT * t * control.lng + t * t * to.lng;
    const lat =
      invT * invT * from.lat + 2 * invT * t * control.lat + t * t * to.lat;
    points.push({ lng, lat });
  }
  return points;
}
