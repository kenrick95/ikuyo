import {
  type GeocodingOptions,
  geocoding,
  config as mapTilerConfig,
} from '@maptiler/sdk';

mapTilerConfig.session = false;

import { calculateZoomFromFeature } from '../../common/geocodingUtils';

export async function stationGeocodingRequest(
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
    console.log('Station geocoding request:', query, geocodingOptions);
    const res = await geocoding.forward(query, geocodingOptions);
    console.log('Station geocoding response:', res);
    const feature = res?.features[0];
    if (feature) {
      [lng, lat] = feature.center ?? [];
      zoom = calculateZoomFromFeature(feature);
    }
  } catch (e) {
    console.error('Station geocoding request failed:', e);
  }

  // Fallback: append "station" in case the user entered a bare city/station name
  if (lng === undefined || lat === undefined) {
    try {
      const res = await geocoding.forward(`${query} station`, geocodingOptions);
      const feature = res?.features[0];
      if (feature) {
        [lng, lat] = feature.center ?? [];
        zoom = calculateZoomFromFeature(feature);
      }
    } catch (e) {
      console.error('Station fallback geocoding request failed:', e);
    }
  }

  return [lng, lat, zoom];
}
