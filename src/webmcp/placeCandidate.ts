import {
  asOptLatitude,
  asOptLongitude,
  asOptNum,
  asStr,
  num,
  str,
} from './schema';

export type PlaceCandidate = {
  label: string;
  latitude: number;
  longitude: number;
  zoom?: number | null;
};

export function placeCandidateSchema(): Record<string, unknown> {
  return {
    type: 'object',
    description:
      'Preferred mapped-place input. Pass one `candidate.place` object returned by place-search verbatim instead of manually copying coordinates.',
    properties: {
      label: str('Canonical display label returned by place-search.'),
      latitude: num('WGS84 latitude returned by place-search.'),
      longitude: num('WGS84 longitude returned by place-search.'),
      zoom: num('Recommended map zoom returned by place-search.'),
    },
    required: ['label', 'latitude', 'longitude'],
  };
}

export function asOptPlaceCandidate(
  value: unknown,
  field = 'place',
): PlaceCandidate | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field} must be a place-search candidate object`);
  }
  const candidate = value as Record<string, unknown>;
  const latitude = asOptLatitude(candidate.latitude, `${field}.latitude`);
  const longitude = asOptLongitude(candidate.longitude, `${field}.longitude`);
  if (latitude == null || longitude == null) {
    throw new Error(`${field} must include latitude and longitude`);
  }
  return {
    label: asStr(candidate.label, `${field}.label`),
    latitude,
    longitude,
    zoom: asOptNum(candidate.zoom, `${field}.zoom`),
  };
}
