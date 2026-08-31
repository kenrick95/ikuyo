import type { Line } from './constants';

export function createGeoJsonData(allLines: Line[]): GeoJSON.FeatureCollection {
  const curveFactors = createCurveFactors(allLines);
  return {
    type: 'FeatureCollection',
    features: allLines.flatMap((line) => {
      const route = createLineGeoJSON(
        { lng: line.from.lng, lat: line.from.lat },
        { lng: line.to.lng, lat: line.to.lat },
        curveFactors.get(line.id),
      );
      const arrowPoint = route.geometry.coordinates.at(-6) ?? [
        line.to.lng,
        line.to.lat,
      ];

      return [
        {
          ...route,
          properties: { routeType: line.type },
        },
        {
          type: 'Feature' as const,
          properties: {
            routeType: line.type,
            rotation: calculateArrowRotation(
              route.geometry.coordinates.at(-7),
              arrowPoint,
            ),
          },
          geometry: {
            type: 'Point' as const,
            coordinates: arrowPoint,
          },
        },
      ];
    }),
  };
}
export function createLineGeoJSON(
  from: { lng: number; lat: number },
  to: { lng: number; lat: number },
  curveFactor = 0.05,
) {
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
 * Assign each repeated or reverse route its own curve lane. Sorting by id makes
 * the result stable when the activity list is re-rendered.
 */
function createCurveFactors(allLines: Line[]): Map<string, number> {
  const routesByEndpoints = new Map<string, Line[]>();
  for (const line of allLines) {
    const endpoints = [coordinateKey(line.from), coordinateKey(line.to)].sort();
    const key = endpoints.join('|');
    const routes = routesByEndpoints.get(key) ?? [];
    routes.push(line);
    routesByEndpoints.set(key, routes);
  }

  const curveFactors = new Map<string, number>();
  for (const routes of routesByEndpoints.values()) {
    routes.sort((a, b) => a.id.localeCompare(b.id));
    routes.forEach((route, index) => {
      curveFactors.set(route.id, 0.05 * curveLane(index));
    });
  }
  return curveFactors;
}

function coordinateKey(point: { lat: number; lng: number }): string {
  return `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
}

function curveLane(index: number): number {
  if (index === 0) return 1;
  const magnitude = Math.ceil(index / 2) + 1;
  return index % 2 === 1 ? -magnitude : magnitude;
}

function calculateArrowRotation(
  previous: number[] | undefined,
  point: number[] | undefined,
): number {
  if (!previous || !point) return 0;
  const deltaLng = point[0] - previous[0];
  const deltaLat = point[1] - previous[1];
  return (Math.atan2(deltaLat, deltaLng) * 180) / Math.PI;
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
