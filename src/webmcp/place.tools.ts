import {
  type GeocodingOptions,
  geocoding,
  config as mapTilerConfig,
} from '@maptiler/sdk';
import { calculateZoomFromFeature } from '../common/geocodingUtils';
import { requireAuthUser } from './context';
import type { WebMCPTool } from './modelContext';
import { asOptStr, asStr, int, str } from './schema';

mapTilerConfig.session = false;

export function createPlaceTools(): WebMCPTool[] {
  return [
    {
      name: 'place-search',
      description:
        'Searches for place candidates without modifying trip data. Returns canonical labels, WGS84 coordinates, and recommended zoom. Ambiguous results are never chosen automatically; select one candidate and pass its coordinates to an activity or accommodation tool.',
      inputSchema: {
        type: 'object',
        properties: {
          query: str('Place name, venue, or address to search for.'),
          country: str(
            'Optional ISO 3166-1 alpha-2 country code used to narrow results.',
          ),
          limit: int('Number of candidates, from 1 to 10. Default 5.'),
        },
        required: ['query'],
      },
      annotations: { readOnlyHint: true },
      async execute(input) {
        requireAuthUser();
        const apiKey = process.env.MAPTILER_API_KEY;
        if (!apiKey) {
          return {
            ok: false,
            candidates: [],
            error:
              'Coordinate lookup is unavailable because MAPTILER_API_KEY is not configured. Location text will be saved without a map pin.',
          };
        }
        const limit = input.limit === undefined ? 5 : Number(input.limit);
        if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
          throw new Error('limit must be an integer from 1 to 10');
        }
        const country = asOptStr(input.country, 'country');
        const options: GeocodingOptions = {
          apiKey,
          language: 'en',
          limit,
          ...(country ? { country: [country.toLowerCase()] } : {}),
        };
        const result = await geocoding.forward(
          asStr(input.query, 'query'),
          options,
        );
        const candidates = result.features.map((feature) => ({
          id: feature.id,
          name: feature.text,
          canonicalName: feature.place_name,
          longitude: feature.center[0],
          latitude: feature.center[1],
          recommendedZoom: calculateZoomFromFeature(feature),
          placeTypes: feature.place_type,
        }));
        return {
          ok: true,
          ambiguous: candidates.length !== 1,
          candidates,
          instruction:
            candidates.length === 0
              ? 'No coordinates found; keep the missing-map state explicit.'
              : 'Choose a candidate explicitly before writing coordinates.',
        };
      },
    },
  ];
}
