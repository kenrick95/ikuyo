import type { GeocodingFeature } from '@maptiler/sdk';

// Inspired by https://github.com/maptiler/maptiler-geocoding-control/blob/e8b4d65286d75c9dd906f24c554c42582ae71b91/src/GeocodingControl.svelte#L752C3-L776C1

// Default zoom levels for different place types
export const PLACE_TYPE_ZOOM_LEVELS: Record<string, number> = {
  continental_marine: 4,
  country: 4,
  region: 6,
  major_landform: 8,
  subregion: 8,
  joint_municipality: 8,
  joint_submunicipality: 9,
  county: 10,
  municipal_district: 11,
  municipality: 12,
  locality: 14,
  postal_code: 14,
  neighbourhood: 15,
  place: 14,
  address: 17,
  'poi.peak': 15,
  'poi.shop': 18,
  'poi.cafe': 18,
  'poi.restaurant': 18,
  'poi.aerodrome': 13,
  poi: 16,
  road: 15,
};

// Calculate zoom level from bounding box
export function calculateZoomFromBbox(bbox: number[]): number | undefined {
  if (bbox.length < 4) return undefined;

  const [west, south, east, north] = bbox;
  const deltaLng = Math.abs(east - west);
  const deltaLat = Math.abs(north - south);

  // Use the larger dimension to determine zoom
  const maxDelta = Math.max(deltaLng, deltaLat);
  if (maxDelta <= 0.000001) return undefined; // Invalid bbox, or way too precise, use other method

  // Calculate zoom level based on geographic extent
  // These values are approximate and can be adjusted based on your needs
  if (maxDelta > 100) return 2; // Very large countries/continents (Russia, Canada, USA, China)
  if (maxDelta > 50) return 3; // Large countries (Brazil, Australia, India)
  if (maxDelta > 30) return 4; // Medium-large countries (Argentina, Kazakhstan)
  if (maxDelta > 20) return 5; // Medium countries (Iran, Mongolia)
  if (maxDelta > 10) return 6; // Smaller countries (Egypt, Turkey, France)
  if (maxDelta > 5) return 7; // Small countries (Japan, Germany, UK)
  if (maxDelta > 2) return 8; // Very small countries or large regions (South Korea, Portugal)
  if (maxDelta > 1) return 10; // Small regions/states
  if (maxDelta > 0.5) return 12; // Cities/metropolitan areas
  if (maxDelta > 0.1) return 14; // Districts/neighborhoods
  if (maxDelta > 0.01) return 16; // Street level
  return 17; // Precise locations (POIs, addresses)
}
// Calculate zoom level from geocoding feature
export function calculateZoomFromFeature(feature: GeocodingFeature): number {
  let zoom: number | undefined;
  if (feature.bbox) {
    zoom = calculateZoomFromBbox(feature.bbox);
  }
  if (feature.place_type && feature.place_type.length > 0) {
    const placeType = feature.place_type[0];
    zoom = PLACE_TYPE_ZOOM_LEVELS[placeType];
    const categories = feature.properties?.categories ?? [];
    for (const category of categories) {
      const placeCategory = `${placeType}.${category}`;
      if (
        zoom !== undefined &&
        PLACE_TYPE_ZOOM_LEVELS[placeCategory] !== undefined
      ) {
        zoom = Math.max(zoom, PLACE_TYPE_ZOOM_LEVELS[placeCategory]);
      } else if (PLACE_TYPE_ZOOM_LEVELS[placeCategory] !== undefined) {
        zoom = PLACE_TYPE_ZOOM_LEVELS[placeCategory];
      }
    }
  }

  console.log('calculateZoomFromFeature', feature, zoom);
  if (zoom !== undefined) {
    return zoom;
  }
  return 12;
}
