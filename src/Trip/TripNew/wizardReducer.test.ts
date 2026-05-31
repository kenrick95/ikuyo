// src/Trip/TripNew/wizardReducer.test.ts
import { DateTime } from 'luxon';
import { describe, expect, test } from 'vitest';
import {
  createInitialWizardState,
  type WizardState,
  wizardReducer,
} from './wizardReducer';

const BASE = createInitialWizardState('Asia/Tokyo', 'USD');

describe('createInitialWizardState', () => {
  test('starts at step 1', () => {
    expect(BASE.step).toBe(1);
  });

  test('seeds timeZone and originCurrency from args', () => {
    expect(BASE.timeZone).toBe('Asia/Tokyo');
    expect(BASE.originCurrency).toBe('USD');
  });

  test('other fields are empty defaults', () => {
    expect(BASE.title).toBe('');
    expect(BASE.region).toBe('');
    expect(BASE.currency).toBe('');
    expect(BASE.startDate).toBeUndefined();
    expect(BASE.endDate).toBeUndefined();
    expect(BASE.travelMode).toBeNull();
    expect(BASE.outboundFlight).toBeNull();
    expect(BASE.returnFlight).toBeNull();
  });
});

describe('wizardReducer', () => {
  test('SET_STEP updates step', () => {
    const next = wizardReducer(BASE, { type: 'SET_STEP', step: 2 });
    expect(next.step).toBe(2);
  });

  test('SET_TITLE updates title', () => {
    const next = wizardReducer(BASE, {
      type: 'SET_TITLE',
      title: 'Tokyo Trip',
    });
    expect(next.title).toBe('Tokyo Trip');
  });

  test('SET_REGION updates region, timeZone, and currency atomically', () => {
    const next = wizardReducer(BASE, {
      type: 'SET_REGION',
      region: 'JP',
      timeZone: 'Asia/Tokyo',
      currency: 'JPY',
    });
    expect(next.region).toBe('JP');
    expect(next.timeZone).toBe('Asia/Tokyo');
    expect(next.currency).toBe('JPY');
  });

  test('SET_REGION does not affect other fields', () => {
    const withTitle = wizardReducer(BASE, {
      type: 'SET_TITLE',
      title: 'My Trip',
    });
    const next = wizardReducer(withTitle, {
      type: 'SET_REGION',
      region: 'JP',
      timeZone: 'Asia/Tokyo',
      currency: 'JPY',
    });
    expect(next.title).toBe('My Trip');
  });

  test('SET_START_DATE updates startDate', () => {
    const date = DateTime.fromISO('2026-10-01');
    const next = wizardReducer(BASE, { type: 'SET_START_DATE', date });
    expect(next.startDate).toBe(date);
  });

  test('SET_END_DATE updates endDate', () => {
    const date = DateTime.fromISO('2026-10-10');
    const next = wizardReducer(BASE, { type: 'SET_END_DATE', date });
    expect(next.endDate).toBe(date);
  });

  test('SET_TIMEZONE updates timeZone', () => {
    const next = wizardReducer(BASE, {
      type: 'SET_TIMEZONE',
      timeZone: 'Europe/London',
    });
    expect(next.timeZone).toBe('Europe/London');
  });

  test('SET_CURRENCY updates currency', () => {
    const next = wizardReducer(BASE, { type: 'SET_CURRENCY', currency: 'EUR' });
    expect(next.currency).toBe('EUR');
  });

  test('SET_ORIGIN_CURRENCY updates originCurrency', () => {
    const next = wizardReducer(BASE, {
      type: 'SET_ORIGIN_CURRENCY',
      originCurrency: 'SGD',
    });
    expect(next.originCurrency).toBe('SGD');
  });

  test('SET_TRAVEL_MODE updates travelMode', () => {
    const next = wizardReducer(BASE, {
      type: 'SET_TRAVEL_MODE',
      travelMode: 'flight',
    });
    expect(next.travelMode).toBe('flight');
  });

  test('SET_TRAVEL_MODE can be set to null', () => {
    const withFlight = wizardReducer(BASE, {
      type: 'SET_TRAVEL_MODE',
      travelMode: 'flight',
    });
    const next = wizardReducer(withFlight, {
      type: 'SET_TRAVEL_MODE',
      travelMode: null,
    });
    expect(next.travelMode).toBeNull();
  });

  test('SET_OUTBOUND_FLIGHT updates outboundFlight', () => {
    const flight = {
      flightNumber: 'SQ321',
      departureDateTime: DateTime.fromISO('2026-10-01T08:00'),
      arrivalDateTime: DateTime.fromISO('2026-10-01T16:00'),
    };
    const next = wizardReducer(BASE, { type: 'SET_OUTBOUND_FLIGHT', flight });
    expect(next.outboundFlight).toBe(flight);
  });

  test('SET_OUTBOUND_FLIGHT can be cleared to null', () => {
    const withFlight = wizardReducer(BASE, {
      type: 'SET_OUTBOUND_FLIGHT',
      flight: {
        flightNumber: 'SQ321',
        departureDateTime: undefined,
        arrivalDateTime: undefined,
      },
    });
    const next = wizardReducer(withFlight, {
      type: 'SET_OUTBOUND_FLIGHT',
      flight: null,
    });
    expect(next.outboundFlight).toBeNull();
  });

  test('SET_RETURN_FLIGHT updates returnFlight', () => {
    const flight = {
      flightNumber: 'SQ322',
      departureDateTime: DateTime.fromISO('2026-10-10T18:00'),
      arrivalDateTime: DateTime.fromISO('2026-10-11T02:00'),
    };
    const next = wizardReducer(BASE, { type: 'SET_RETURN_FLIGHT', flight });
    expect(next.returnFlight).toBe(flight);
  });

  test('reducer is pure — does not mutate state', () => {
    const frozen = Object.freeze({ ...BASE }) as WizardState;
    expect(() =>
      wizardReducer(frozen, { type: 'SET_TITLE', title: 'New' }),
    ).not.toThrow();
  });
});
