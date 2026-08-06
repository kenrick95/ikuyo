import {
  ALL_CURRENCIES,
  getDefaultCurrencyForRegion,
} from '../../data/intl/currencies';
import {
  ALL_TIMEZONES,
  getDefaultTimezoneForRegion,
} from '../../data/intl/timezones';

export type FlightCapture = {
  flightNumber?: string | undefined;
  departureAirport?: string | undefined;
  arrivalAirport?: string | undefined;
  departureDateTime?: Temporal.PlainDateTime | undefined;
  arrivalDateTime?: Temporal.PlainDateTime | undefined;
  departureTimeZone?: string | undefined;
  arrivalTimeZone?: string | undefined;
  departureLat?: number | undefined;
  departureLng?: number | undefined;
  departureZoom?: number | undefined;
  arrivalLat?: number | undefined;
  arrivalLng?: number | undefined;
  arrivalZoom?: number | undefined;
};

export type TrainCapture = {
  trainNumber?: string | undefined;
  departureStation?: string | undefined;
  arrivalStation?: string | undefined;
  departureDateTime?: Temporal.PlainDateTime | undefined;
  arrivalDateTime?: Temporal.PlainDateTime | undefined;
  departureTimeZone?: string | undefined;
  arrivalTimeZone?: string | undefined;
  departureLat?: number | undefined;
  departureLng?: number | undefined;
  departureZoom?: number | undefined;
  arrivalLat?: number | undefined;
  arrivalLng?: number | undefined;
  arrivalZoom?: number | undefined;
};

export type WizardState = {
  step: 1 | 2 | 3;
  // Step 1
  title: string;
  region: string;
  startDate: Temporal.PlainDate | undefined;
  endDate: Temporal.PlainDate | undefined;
  // Step 2 (pre-filled from region)
  timeZone: string;
  currency: string;
  originCurrency: string;
  // Step 3
  travelMode: 'flight' | 'train' | 'other' | null;
  outboundFlight: FlightCapture | null;
  returnFlight: FlightCapture | null;
  outboundTrain: TrainCapture | null;
  returnTrain: TrainCapture | null;
};

export type WizardAction =
  | { type: 'SET_STEP'; step: 1 | 2 | 3 }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_REGION'; region: string }
  | { type: 'SET_START_DATE'; date: Temporal.PlainDate | undefined }
  | { type: 'SET_END_DATE'; date: Temporal.PlainDate | undefined }
  | { type: 'SET_TIMEZONE'; timeZone: string }
  | { type: 'SET_CURRENCY'; currency: string }
  | { type: 'SET_ORIGIN_CURRENCY'; originCurrency: string }
  | {
      type: 'SET_TRAVEL_MODE';
      travelMode: 'flight' | 'train' | 'other' | null;
    }
  | { type: 'SET_OUTBOUND_FLIGHT'; flight: FlightCapture | null }
  | { type: 'SET_RETURN_FLIGHT'; flight: FlightCapture | null }
  | { type: 'SET_OUTBOUND_TRAIN'; train: TrainCapture | null }
  | { type: 'SET_RETURN_TRAIN'; train: TrainCapture | null };

export function wizardReducer(
  state: WizardState,
  action: WizardAction,
): WizardState {
  // console.log('wizardReducer action:', action, 'prev state:', state);
  switch (action.type) {
    case 'SET_STEP':
      if (state.step === 2 && action.step === 3) {
        // When moving from step 2 to 3, pre-fill outbound flight and return flight with default values based on the trip's start and end dates only if it has not been set yet
        const currentTimeZone = Temporal.Now.timeZoneId();
        let newState = { ...state, step: action.step };
        if (!state.outboundFlight && state.startDate) {
          const zonedDepartureDateTime = state.startDate
            .toPlainDateTime({
              hour: 9,
              minute: 0,
            })
            .toZonedDateTime(state.timeZone);
          const zonedArrivalDateTime = zonedDepartureDateTime
            .with({
              hour: 12,
              minute: 0,
            })
            .withTimeZone(currentTimeZone);

          const defaultOutboundFlight: FlightCapture = {
            departureDateTime: zonedDepartureDateTime.toPlainDateTime(),
            arrivalDateTime: zonedArrivalDateTime.toPlainDateTime(),
            departureTimeZone: currentTimeZone,
            arrivalTimeZone: state.timeZone,
          };
          newState = { ...newState, outboundFlight: defaultOutboundFlight };
        }
        if (!state.returnFlight && state.endDate) {
          const zonedDepartureDateTime = state.endDate
            .toPlainDateTime({
              hour: 15,
              minute: 0,
            })
            .toZonedDateTime(state.timeZone);
          const zonedArrivalDateTime = zonedDepartureDateTime
            .with({
              hour: 18,
              minute: 0,
            })
            .withTimeZone(currentTimeZone);

          const defaultReturnFlight: FlightCapture = {
            departureDateTime: zonedDepartureDateTime.toPlainDateTime(),
            arrivalDateTime: zonedArrivalDateTime.toPlainDateTime(),
            departureTimeZone: state.timeZone,
            arrivalTimeZone: currentTimeZone,
          };
          newState = { ...newState, returnFlight: defaultReturnFlight };
        }
        if (!state.outboundTrain && state.startDate) {
          const zonedDepartureDateTime = state.startDate
            .toPlainDateTime({
              hour: 9,
              minute: 0,
            })
            .toZonedDateTime(state.timeZone);
          const zonedArrivalDateTime = zonedDepartureDateTime
            .with({
              hour: 12,
              minute: 0,
            })
            .withTimeZone(currentTimeZone);

          const defaultOutboundTrain: TrainCapture = {
            departureDateTime: zonedDepartureDateTime.toPlainDateTime(),
            arrivalDateTime: zonedArrivalDateTime.toPlainDateTime(),
            departureTimeZone: currentTimeZone,
            arrivalTimeZone: state.timeZone,
          };
          newState = { ...newState, outboundTrain: defaultOutboundTrain };
        }
        if (!state.returnTrain && state.endDate) {
          const zonedDepartureDateTime = state.endDate
            .toPlainDateTime({
              hour: 15,
              minute: 0,
            })
            .toZonedDateTime(state.timeZone);
          const zonedArrivalDateTime = zonedDepartureDateTime
            .with({
              hour: 18,
              minute: 0,
            })
            .withTimeZone(currentTimeZone);

          const defaultReturnTrain: TrainCapture = {
            departureDateTime: zonedDepartureDateTime.toPlainDateTime(),
            arrivalDateTime: zonedArrivalDateTime.toPlainDateTime(),
            departureTimeZone: state.timeZone,
            arrivalTimeZone: currentTimeZone,
          };
          newState = { ...newState, returnTrain: defaultReturnTrain };
        }
        return newState;
      }

      return { ...state, step: action.step };
    case 'SET_TITLE':
      return { ...state, title: action.title };
    case 'SET_REGION': {
      const newTz = getDefaultTimezoneForRegion(action.region);
      const newCurrency = getDefaultCurrencyForRegion(action.region);

      return {
        ...state,
        region: action.region,
        timeZone:
          newTz && ALL_TIMEZONES.includes(newTz) ? newTz : state.timeZone,
        currency:
          newCurrency && ALL_CURRENCIES.includes(newCurrency)
            ? newCurrency
            : state.currency,
        startDate: state.startDate,
        endDate: state.endDate,
      };
    }
    case 'SET_START_DATE':
      // if user has not set the end date yet, we can auto-set it to the same day as the start date
      if (!state.endDate) {
        return {
          ...state,
          startDate: action.date,
          endDate: action.date,
        };
      }
      return {
        ...state,
        startDate: action.date,
      };
    case 'SET_END_DATE':
      return {
        ...state,
        endDate: action.date,
      };
    case 'SET_TIMEZONE': {
      const nextTimeZone = action.timeZone;
      return {
        ...state,
        timeZone: nextTimeZone,
        startDate: state.startDate,
        endDate: state.endDate,
      };
    }
    case 'SET_CURRENCY':
      return { ...state, currency: action.currency };
    case 'SET_ORIGIN_CURRENCY':
      return { ...state, originCurrency: action.originCurrency };
    case 'SET_TRAVEL_MODE':
      return { ...state, travelMode: action.travelMode };
    case 'SET_OUTBOUND_FLIGHT':
      // Clear the outbound flight if the action specifies null; else merge it
      if (action.flight === null) {
        return { ...state, outboundFlight: null };
      }
      return {
        ...state,
        outboundFlight: { ...(state.outboundFlight || {}), ...action.flight },
      };
    case 'SET_RETURN_FLIGHT':
      // Clear the return flight if the action specifies null; else merge it
      if (action.flight === null) {
        return { ...state, returnFlight: null };
      }
      return {
        ...state,
        returnFlight: { ...(state.returnFlight || {}), ...action.flight },
      };
    case 'SET_OUTBOUND_TRAIN':
      // Clear the outbound train if the action specifies null; else merge it
      if (action.train === null) {
        return { ...state, outboundTrain: null };
      }
      return {
        ...state,
        outboundTrain: { ...(state.outboundTrain || {}), ...action.train },
      };
    case 'SET_RETURN_TRAIN':
      // Clear the return train if the action specifies null; else merge it
      if (action.train === null) {
        return { ...state, returnTrain: null };
      }
      return {
        ...state,
        returnTrain: { ...(state.returnTrain || {}), ...action.train },
      };
    default:
      return state;
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
    outboundTrain: null,
    returnTrain: null,
  };
}
