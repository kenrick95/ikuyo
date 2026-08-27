import { describe, expect, test } from 'vitest';
import {
  asOptLatitude,
  asOptLongitude,
  asOptNum,
  asOptStr,
  asStr,
  bool,
  epochOrIso,
  num,
  str,
  strEnum,
  toEpochMs,
  toEpochMsRequired,
} from './schema';

describe('schema helpers', () => {
  test('str/num/bool/strEnum produce JSON-Schema descriptors', () => {
    expect(str('a')).toEqual({ type: 'string', description: 'a' });
    expect(num('n')).toEqual({ type: 'number', description: 'n' });
    expect(bool('b')).toEqual({ type: 'boolean', description: 'b' });
    expect(epochOrIso('when')).toEqual({
      anyOf: [
        { type: 'number', description: 'Epoch milliseconds.' },
        {
          type: 'string',
          format: 'date-time',
          description: 'ISO-8601 date-time.',
        },
        { type: 'null', description: 'Clear an optional timestamp.' },
      ],
      description: 'when',
    });
    expect(strEnum('e', ['x', 'y'])).toEqual({
      type: 'string',
      enum: ['x', 'y'],
      description: 'e',
    });
  });

  test('toEpochMs accepts numbers and ISO strings', () => {
    expect(toEpochMs(0, 'd')).toBe(0);
    expect(toEpochMs('1970-01-01T00:00:00Z', 'd')).toBe(0);
    expect(toEpochMs(undefined, 'd')).toBeUndefined();
    expect(toEpochMs(null, 'd')).toBeNull();
    expect(toEpochMs('', 'd')).toBeUndefined();
    expect(() => toEpochMs('not-a-date', 'd')).toThrow(/ISO-8601/);
    expect(() => toEpochMs(Number.NaN, 'd')).toThrow(/epoch-ms/);
  });

  test('toEpochMsRequired throws on missing input', () => {
    expect(toEpochMsRequired(1000, 'd')).toBe(1000);
    expect(() => toEpochMsRequired(undefined, 'd')).toThrow(/required/);
    expect(() => toEpochMsRequired(null, 'd')).toThrow(/required/);
  });

  test('asStr / asOptStr / asOptNum validate input', () => {
    expect(asStr('abc', 'f')).toBe('abc');
    expect(() => asStr('', 'f')).toThrow(/f is required/);
    expect(() => asStr(123, 'f')).toThrow(/f is required/);
    expect(asOptStr('x', 'f')).toBe('x');
    expect(asOptStr(undefined, 'f')).toBeUndefined();
    expect(asOptStr(null, 'f')).toBeNull();
    expect(asOptNum(4, 'f')).toBe(4);
    expect(asOptNum(undefined, 'f')).toBeUndefined();
    expect(() => asOptNum('oops', 'f')).toThrow(/f must be a number/);
  });

  test('WGS84 coordinate helpers validate their ranges', () => {
    expect(asOptLatitude(1.35, 'lat')).toBe(1.35);
    expect(asOptLongitude(103.82, 'lng')).toBe(103.82);
    expect(() => asOptLatitude(91, 'lat')).toThrow(/-90 and 90/);
    expect(() => asOptLongitude(181, 'lng')).toThrow(/-180 and 180/);
  });
});
