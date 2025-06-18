import {
  type GeocodingOptions,
  geocoding,
  config as mapTilerConfig,
} from '@maptiler/sdk';

mapTilerConfig.session = false;

import { calculateZoomFromFeature } from '../common/geocodingUtils';
import { REGIONS_MAP } from '../data/intl/regions';

export async function geocodingRequest(
  currentLocation: string,
  tripRegion: string,
): Promise<[number | undefined, number | undefined, number | undefined]> {
  // if coordinates are not set, use geocoding from location to get the coordinates
  let location = currentLocation;
  const geocodingOptions: GeocodingOptions = {
    language: 'en',
    limit: 5,
    country: [tripRegion.toLowerCase()],
    types: ['poi', 'major_landform', 'address'],
    apiKey: process.env.MAPTILER_API_KEY,
  };

  if (!location) {
    // if location is not yet set, set location as the trip region
    const region = REGIONS_MAP[tripRegion] ?? 'Japan';
    location = region;
    geocodingOptions.types = ['country'];
  }

  let lat: number | undefined;
  let lng: number | undefined;
  let zoom: number | undefined;
  console.log('geocoding: request', location, geocodingOptions);
  if (location) {
    try {
      const res = await geocoding.forward(location, geocodingOptions);
      console.log('geocoding: response', res);

      const feature = res?.features[0];
      if (feature) {
        [lng, lat] = feature.center ?? [];

        // Calculate zoom level from response
        zoom = calculateZoomFromFeature(feature);
      }
    } catch (e) {
      console.error('Geocoding request failed:', e);
    }
  }
  if (lng === undefined || lat === undefined) {
    try {
      // if location coordinate couldn't be found, set location as the trip region
      const region = REGIONS_MAP[tripRegion] ?? 'Japan';
      geocodingOptions.types = ['country'];
      const res = await geocoding.forward(region, geocodingOptions);
      console.log('geocoding: response 2', res);

      const feature = res?.features[0];
      if (feature) {
        [lng, lat] = feature.center ?? [];

        // For country-level fallback, use appropriate zoom
        zoom = calculateZoomFromFeature(feature);
      }
    } catch (e) {
      console.error('Geocoding request failed:', e);
    }
  }

  return [lng, lat, zoom];
}
