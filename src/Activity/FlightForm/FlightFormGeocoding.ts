import {
  type GeocodingOptions,
  geocoding,
  config as mapTilerConfig,
} from '@maptiler/sdk';

mapTilerConfig.session = false;

import { calculateZoomFromFeature } from '../../common/geocodingUtils';

export async function airportGeocodingRequest(
  query: string,
): Promise<[number | undefined, number | undefined, number | undefined]> {
  if (!query.trim()) {
    return [undefined, undefined, undefined];
  }

  const geocodingOptions: GeocodingOptions = {
    language: 'en',
    limit: 5,
    types: ['poi'],
    apiKey: process.env.MAPTILER_API_KEY,
  };

  let lat: number | undefined;
  let lng: number | undefined;
  let zoom: number | undefined;

  try {
    const res = await geocoding.forward(query, geocodingOptions);
    const feature = res?.features[0];
    if (feature) {
      [lng, lat] = feature.center ?? [];
      zoom = calculateZoomFromFeature(feature);
    }
  } catch (e) {
    console.error('Airport geocoding request failed:', e);
  }

  // Fallback: append "airport" in case the user entered a bare IATA code
  if (lng === undefined || lat === undefined) {
    try {
      const res = await geocoding.forward(`${query} airport`, geocodingOptions);
      const feature = res?.features[0];
      if (feature) {
        [lng, lat] = feature.center ?? [];
        zoom = calculateZoomFromFeature(feature);
      }
    } catch (e) {
      console.error('Airport fallback geocoding request failed:', e);
    }
  }

  return [lng, lat, zoom];
}
