import { describe, expect, test } from 'vitest';
import { getColorForHandle, hashString } from './UserHandle';

const colors = [
  'gray',
  'gold',
  'bronze',
  'brown',
  'plum',
  'purple',
  'violet',
  'iris',
  'indigo',
  'blue',
  'cyan',
  'teal',
  'jade',
  'green',
  'grass',
  'lime',
  'mint',
  'sky',
] as const;

describe('hashString', () => {
  test('returns a non-negative integer for any handle', () => {
    expect(hashString('alice')).toBeGreaterThanOrEqual(0);
    expect(hashString('bob')).toBeGreaterThanOrEqual(0);
    expect(hashString('')).toBeGreaterThanOrEqual(0);
  });

  test('is deterministic for the same input', () => {
    const handle = 'charlie@example.com';
    expect(hashString(handle)).toBe(hashString(handle));
  });

  test('produces distinct values for distinct handles', () => {
    const handles = ['alice', 'bob', 'carol', 'dave', 'eve'];
    const hashes = new Set(handles.map(hashString));
    expect(hashes.size).toBe(handles.length);
  });

  test('handles non-ASCII characters', () => {
    expect(hashString('山田')).toBeGreaterThanOrEqual(0);
    expect(hashString('😀')).toBeGreaterThanOrEqual(0);
  });
});

describe('getColorForHandle', () => {
  test('returns gray for undefined handle', () => {
    expect(getColorForHandle(undefined)).toBe('gray');
  });

  test('returns gray for empty string', () => {
    expect(getColorForHandle('')).toBe('gray');
  });

  test('always returns one of the available colors', () => {
    const handles = [
      'alice',
      'bob',
      'carol',
      '山田',
      '😀',
      'user-name',
      'x'.repeat(200),
    ];
    for (const handle of handles) {
      expect(colors).toContain(getColorForHandle(handle));
    }
  });

  test('is deterministic for the same handle', () => {
    const handle = 'some-user';
    expect(getColorForHandle(handle)).toBe(getColorForHandle(handle));
  });

  test('distributes a set of handles across more than one color', () => {
    const handles = Array.from({ length: 100 }, (_, i) => `user-${i}`);
    const distinct = new Set(handles.map(getColorForHandle));
    expect(distinct.size).toBeGreaterThan(1);
  });
});
