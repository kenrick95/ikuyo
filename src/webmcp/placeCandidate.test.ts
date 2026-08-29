import { describe, expect, it } from 'vitest';
import { asOptPlaceCandidate } from './placeCandidate';

describe('WebMCP place candidate handoff', () => {
  it('accepts a place-search candidate verbatim', () => {
    expect(
      asOptPlaceCandidate({
        label: 'Shimokitazawa, Tokyo, Japan',
        latitude: 35.6616,
        longitude: 139.666,
        zoom: 15,
      }),
    ).toEqual({
      label: 'Shimokitazawa, Tokyo, Japan',
      latitude: 35.6616,
      longitude: 139.666,
      zoom: 15,
    });
  });

  it('rejects incomplete and invalid coordinate pairs', () => {
    expect(() =>
      asOptPlaceCandidate({ label: 'Missing longitude', latitude: 35 }),
    ).toThrow('must include latitude and longitude');
    expect(() =>
      asOptPlaceCandidate({
        label: 'Invalid latitude',
        latitude: 100,
        longitude: 139,
      }),
    ).toThrow('latitude must be between -90 and 90');
  });
});
