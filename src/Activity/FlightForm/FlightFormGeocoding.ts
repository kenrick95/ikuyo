import {
  type GeocodingOptions,
  geocoding,
  config as mapTilerConfig,
} from '@maptiler/sdk';

mapTilerConfig.session = false;

import { calculateZoomFromFeature } from '../../common/geocodingUtils';

export async function airportGeocodingRequest(
  query: string,
  country?: string,
): Promise<[number | undefined, number | undefined, number | undefined]> {
  if (!query.trim()) {
    return [undefined, undefined, undefined];
  }

  const baseOptions: GeocodingOptions = {
    language: 'en',
    limit: 5,
    types: ['poi'],
    apiKey: process.env.MAPTILER_API_KEY,
  };
  // When a country is provided, scope the search to it (e.g. origin/destination region).
  const countryOptions: GeocodingOptions = country
    ? { ...baseOptions, country: [country.toLowerCase()] }
    : baseOptions;

  let lat: number | undefined;
  let lng: number | undefined;
  let zoom: number | undefined;

  const geocode = async (q: string, options: GeocodingOptions) => {
    try {
      console.log('Airport geocoding request:', q, options);
      const res = await geocoding.forward(q, options);
      console.log('Airport geocoding response:', res);
      const feature = res?.features[0];
      if (feature?.center) {
        [lng, lat] = feature.center ?? [];
        zoom = calculateZoomFromFeature(feature);
        return true;
      }
    } catch (e) {
      console.error('Airport geocoding request failed:', e);
    }
    return false;
  };

  let found = await geocode(query, countryOptions);
  // Fallback: append "airport" in case the user entered a bare IATA code
  if (!found) found = await geocode(`${query} airport`, countryOptions);
  // Last resort: retry without the country scope (avoids empty results)
  if (!found && country) {
    found = await geocode(query, baseOptions);
    if (!found) await geocode(`${query} airport`, baseOptions);
  }

  return [lng, lat, zoom];
}
