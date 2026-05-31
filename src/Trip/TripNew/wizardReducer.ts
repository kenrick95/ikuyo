// src/Trip/TripNew/wizardReducer.ts
import type { DateTime } from 'luxon';

export type FlightCapture = {
  flightNumber: string;
  departureDateTime: DateTime | undefined;
  arrivalDateTime: DateTime | undefined;
};

export type WizardState = {
  step: 1 | 2 | 3;
  // Step 1
  title: string;
  region: string;
  startDate: DateTime | undefined;
  endDate: DateTime | undefined;
  // Step 2 (pre-filled from region)
  timeZone: string;
  currency: string;
  originCurrency: string;
  // Step 3
  travelMode: 'flight' | 'other' | null;
  outboundFlight: FlightCapture | null;
  returnFlight: FlightCapture | null;
};

export type WizardAction =
  | { type: 'SET_STEP'; step: 1 | 2 | 3 }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_REGION'; region: string; timeZone: string; currency: string }
  | { type: 'SET_START_DATE'; date: DateTime | undefined }
  | { type: 'SET_END_DATE'; date: DateTime | undefined }
  | { type: 'SET_TIMEZONE'; timeZone: string }
  | { type: 'SET_CURRENCY'; currency: string }
  | { type: 'SET_ORIGIN_CURRENCY'; originCurrency: string }
  | { type: 'SET_TRAVEL_MODE'; travelMode: 'flight' | 'other' | null }
  | { type: 'SET_OUTBOUND_FLIGHT'; flight: FlightCapture | null }
  | { type: 'SET_RETURN_FLIGHT'; flight: FlightCapture | null };

export function wizardReducer(
  state: WizardState,
  action: WizardAction,
): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_TITLE':
      return { ...state, title: action.title };
    case 'SET_REGION':
      return {
        ...state,
        region: action.region,
        timeZone: action.timeZone,
        currency: action.currency,
      };
    case 'SET_START_DATE':
      return { ...state, startDate: action.date };
    case 'SET_END_DATE':
      return { ...state, endDate: action.date };
    case 'SET_TIMEZONE':
      return { ...state, timeZone: action.timeZone };
    case 'SET_CURRENCY':
      return { ...state, currency: action.currency };
    case 'SET_ORIGIN_CURRENCY':
      return { ...state, originCurrency: action.originCurrency };
    case 'SET_TRAVEL_MODE':
      return { ...state, travelMode: action.travelMode };
    case 'SET_OUTBOUND_FLIGHT':
      return { ...state, outboundFlight: action.flight };
    case 'SET_RETURN_FLIGHT':
      return { ...state, returnFlight: action.flight };
  }
}

export function createInitialWizardState(
  currentTimeZone: string,
  originCurrency: string,
): WizardState {
  return {
    step: 1,
    title: '',
    region: '',
    startDate: undefined,
    endDate: undefined,
    timeZone: currentTimeZone,
    currency: '',
    originCurrency,
    travelMode: null,
    outboundFlight: null,
    returnFlight: null,
  };
}
