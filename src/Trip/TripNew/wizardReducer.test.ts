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
    });
    expect(next.title).toBe('My Trip');
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

  test('SET_TRAVEL_MODE can be set to train', () => {
    const next = wizardReducer(BASE, {
      type: 'SET_TRAVEL_MODE',
      travelMode: 'train',
    });
    expect(next.travelMode).toBe('train');
  });

  test('SET_OUTBOUND_FLIGHT updates outboundFlight', () => {
    const flight = {
      flightNumber: 'SQ321',
      departureAirport: 'SYD',
      arrivalAirport: 'NRT',
      departureDateTime: Temporal.PlainDateTime.from('2026-10-01T08:00'),
      arrivalDateTime: Temporal.PlainDateTime.from('2026-10-01T16:00'),
      departureTimeZone: 'America/New_York',
      arrivalTimeZone: 'Asia/Tokyo',
      departureLat: undefined,
      departureLng: undefined,
      departureZoom: undefined,
      arrivalLat: undefined,
      arrivalLng: undefined,
      arrivalZoom: undefined,
    };
    const next = wizardReducer(BASE, { type: 'SET_OUTBOUND_FLIGHT', flight });
    expect(next.outboundFlight).toStrictEqual(flight);
  });

  test('SET_OUTBOUND_FLIGHT can be cleared to null', () => {
    const withFlight = wizardReducer(BASE, {
      type: 'SET_OUTBOUND_FLIGHT',
      flight: {
        flightNumber: 'SQ321',
        departureAirport: '',
        arrivalAirport: '',
        departureDateTime: undefined,
        arrivalDateTime: undefined,
        departureTimeZone: 'America/New_York',
        arrivalTimeZone: 'Asia/Tokyo',
        departureLat: undefined,
        departureLng: undefined,
        departureZoom: undefined,
        arrivalLat: undefined,
        arrivalLng: undefined,
        arrivalZoom: undefined,
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
      departureAirport: 'NRT',
      arrivalAirport: 'SYD',
      departureDateTime: Temporal.PlainDateTime.from('2026-10-10T18:00'),
      arrivalDateTime: Temporal.PlainDateTime.from('2026-10-11T02:00'),
      departureTimeZone: 'Asia/Tokyo',
      arrivalTimeZone: 'America/New_York',
      departureLat: undefined,
      departureLng: undefined,
      departureZoom: undefined,
      arrivalLat: undefined,
      arrivalLng: undefined,
      arrivalZoom: undefined,
    };
    const next = wizardReducer(BASE, { type: 'SET_RETURN_FLIGHT', flight });
    expect(next.returnFlight).toStrictEqual(flight);
  });

  test('SET_OUTBOUND_TRAIN updates outboundTrain', () => {
    const train = {
      trainNumber: 'TGV 6181',
      departureStation: 'Paris Gare de Lyon',
      arrivalStation: 'Marseille Saint-Charles',
      departureDateTime: Temporal.PlainDateTime.from('2026-10-01T09:00'),
      arrivalDateTime: Temporal.PlainDateTime.from('2026-10-01T12:00'),
      departureTimeZone: 'Europe/Paris',
      arrivalTimeZone: 'Asia/Tokyo',
      departureLat: 2.37,
      departureLng: 48.84,
      departureZoom: 9,
      arrivalLat: 5.37,
      arrivalLng: 43.3,
      arrivalZoom: 9,
    };
    const next = wizardReducer(BASE, { type: 'SET_OUTBOUND_TRAIN', train });
    expect(next.outboundTrain).toStrictEqual(train);
  });

  test('SET_OUTBOUND_TRAIN can be cleared to null', () => {
    const withTrain = wizardReducer(BASE, {
      type: 'SET_OUTBOUND_TRAIN',
      train: {
        trainNumber: 'TGV 6181',
        departureStation: 'Paris Gare de Lyon',
        arrivalStation: 'Marseille Saint-Charles',
        departureDateTime: undefined,
        arrivalDateTime: undefined,
        departureTimeZone: 'Europe/Paris',
        arrivalTimeZone: 'Asia/Tokyo',
        departureLat: undefined,
        departureLng: undefined,
        departureZoom: undefined,
        arrivalLat: undefined,
        arrivalLng: undefined,
        arrivalZoom: undefined,
      },
    });
    const next = wizardReducer(withTrain, {
      type: 'SET_OUTBOUND_TRAIN',
      train: null,
    });
    expect(next.outboundTrain).toBeNull();
  });

  test('SET_RETURN_TRAIN updates returnTrain', () => {
    const train = {
      trainNumber: 'TGV 6182',
      departureStation: 'Marseille Saint-Charles',
      arrivalStation: 'Paris Gare de Lyon',
      departureDateTime: Temporal.PlainDateTime.from('2026-10-10T18:00'),
      arrivalDateTime: Temporal.PlainDateTime.from('2026-10-10T21:00'),
      departureTimeZone: 'Asia/Tokyo',
      arrivalTimeZone: 'Europe/Paris',
      departureLat: undefined,
      departureLng: undefined,
      departureZoom: undefined,
      arrivalLat: undefined,
      arrivalLng: undefined,
      arrivalZoom: undefined,
    };
    const next = wizardReducer(BASE, { type: 'SET_RETURN_TRAIN', train });
    expect(next.returnTrain).toStrictEqual(train);
  });

  test('reducer is pure — does not mutate state', () => {
    const frozen = Object.freeze({ ...BASE }) as WizardState;
    expect(() =>
      wizardReducer(frozen, { type: 'SET_TITLE', title: 'New' }),
    ).not.toThrow();
  });
});

describe('wizardReducer - step 3 train defaults', () => {
  function stateAtStep2(
    startDate: string,
    endDate: string,
    timeZone: string,
  ): WizardState {
    const step2 = wizardReducer(BASE, { type: 'SET_STEP', step: 2 });
    const withStart = wizardReducer(step2, {
      type: 'SET_START_DATE',
      date: Temporal.PlainDate.from(startDate),
    });
    const withEnd = wizardReducer(withStart, {
      type: 'SET_END_DATE',
      date: Temporal.PlainDate.from(endDate),
    });
    return wizardReducer(withEnd, { type: 'SET_TIMEZONE', timeZone });
  }

  test('moving to step 3 prefills outbound and return trains', () => {
    const atStep2 = stateAtStep2('2026-10-01', '2026-10-10', 'Asia/Tokyo');
    const next = wizardReducer(atStep2, { type: 'SET_STEP', step: 3 });
    const local = Temporal.Now.timeZoneId();

    expect(next.outboundTrain).not.toBeNull();
    expect(next.returnTrain).not.toBeNull();

    // Outbound times are wall-clock converted into the local timezone
    expect(next.outboundTrain?.departureTimeZone).toBe(local);
    expect(next.outboundTrain?.arrivalTimeZone).toBe('Asia/Tokyo');

    // Return departure wall-clock is 15:00 in the trip timezone (not converted)
    expect(next.returnTrain?.departureDateTime).toEqual(
      Temporal.PlainDateTime.from('2026-10-10T15:00'),
    );
    expect(next.returnTrain?.departureTimeZone).toBe('Asia/Tokyo');
    // Return arrival is converted back into the local timezone
    expect(next.returnTrain?.arrivalTimeZone).toBe(local);
  });

  test('outbound and return trains use differing local and trip time zones', () => {
    const atStep2 = stateAtStep2('2026-10-01', '2026-10-10', 'Asia/Tokyo');
    const next = wizardReducer(atStep2, { type: 'SET_STEP', step: 3 });
    const local = Temporal.Now.timeZoneId();
    // Outbound: departure tagged as the user's local timezone, arrival in trip tz
    expect(next.outboundTrain?.departureTimeZone).toBe(local);
    expect(next.outboundTrain?.arrivalTimeZone).toBe('Asia/Tokyo');
    // Return: departure in trip tz, arrival back in the user's local timezone
    expect(next.returnTrain?.departureTimeZone).toBe('Asia/Tokyo');
    expect(next.returnTrain?.arrivalTimeZone).toBe(local);
  });

  test('moving to step 3 does not overwrite an existing outbound train', () => {
    const atStep2 = stateAtStep2('2026-10-01', '2026-10-10', 'Asia/Tokyo');
    const existing = {
      trainNumber: 'TGV 1234',
      departureStation: 'Lyon',
      arrivalStation: 'Paris',
      departureDateTime: Temporal.PlainDateTime.from('2026-10-01T07:30'),
      arrivalDateTime: Temporal.PlainDateTime.from('2026-10-01T10:30'),
      departureTimeZone: 'Europe/Paris',
      arrivalTimeZone: 'Europe/Paris',
      departureLat: undefined,
      departureLng: undefined,
      departureZoom: undefined,
      arrivalLat: undefined,
      arrivalLng: undefined,
      arrivalZoom: undefined,
    };
    const withTrain = wizardReducer(atStep2, {
      type: 'SET_OUTBOUND_TRAIN',
      train: existing,
    });
    const next = wizardReducer(withTrain, { type: 'SET_STEP', step: 3 });
    expect(next.outboundTrain).toStrictEqual(existing);
  });

  test('moving to step 3 prefills flight and train captures independently', () => {
    const atStep2 = stateAtStep2('2026-10-01', '2026-10-10', 'Asia/Tokyo');
    const next = wizardReducer(atStep2, { type: 'SET_STEP', step: 3 });
    expect(next.outboundFlight).not.toBeNull();
    expect(next.returnFlight).not.toBeNull();
    expect(next.outboundTrain).not.toBeNull();
    expect(next.returnTrain).not.toBeNull();
  });
});
