# Design: New Trip Onboarding Wizard

**Date:** 2026-05-31  
**Status:** Approved  
**Author:** Brainstorming session

---

## Problem

The current "New Trip" flow presents a single flat dialog (`TripNewDialog`) containing 7 required fields all at once: trip name, region, timezone, start date, end date, destination currency, and origin currency. This is overwhelming for first-time users and feels like filling out a form rather than planning a trip.

---

## Goals

- Reduce cognitive load by splitting the creation flow into focused steps
- Make timezone and currency feel like confirmation rather than data entry (via auto-fill from region)
- Guide users to optionally add outbound/return flights immediately after trip creation
- Target audience: first-time and new users

---

## Non-Goals

- Changing the Edit trip flow — `TripForm` and `TripEditDialog` are unchanged
- Full flight form in wizard — only lightweight flight capture (full `FlightForm` remains accessible from the trip page)
- Other transport modes in this iteration (placeholder "Coming soon" card only)

---

## Solution: 3-Step Full-Page Wizard

### Route

Add a new route `RouteTripNew` at `/trip/new`:

```ts
export const RouteTripNew = createRouteParam('/trip/new', identity);
```

Add a corresponding lazy-loaded page component `PageTripNew` with `withLoading()`.

Register the route in `App.tsx` before the catch-all `RouteTrip` match (since `/trip/:id` would otherwise match `/trip/new`).

Entry points that currently call `pushDialog(TripNewDialog, { user })` are replaced with `setLocation(RouteTripNew.asRouteTarget())`.

---

### Wizard State

All state lives in a `useReducer` at the `PageTripNew` level. No store mutation until final submit.

The reducer, state type, action union, and initial state are extracted into a co-located file `wizardReducer.ts` so they can be unit-tested independently of the component.

```ts
// src/Trip/TripNew/wizardReducer.ts

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

  // Step 2 (pre-filled from step 1 region)
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

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_TITLE':
      return { ...state, title: action.title };
    case 'SET_REGION':
      // Region change auto-fills timezone and currency (same logic as TripForm's handleRegionChange)
      return { ...state, region: action.region, timeZone: action.timeZone, currency: action.currency };
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

export function createInitialWizardState(currentTimeZone: string, originCurrency: string): WizardState {
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
```

Usage in `PageTripNew`:

```ts
const [state, dispatch] = useReducer(wizardReducer, undefined, () =>
  createInitialWizardState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    inferOriginCurrency(), // from browser locale or last trip in store
  )
);
```

The `SET_REGION` action bundles timezone + currency together so the reducer handles the auto-fill atomically (mirrors `handleRegionChange` in `TripForm`).

---

### Step 1 — "The basics"

**Fields:**
| Field | Component | Notes |
|---|---|---|
| Trip name | `TextField.Root` | Large, autofocused |
| Destination region | `Select.Root` (existing `fieldSelectRegion` pattern) | Drives auto-fill of timezone + currency |
| Start date | `DateTimePicker` (Date mode) | |
| End date | `DateTimePicker` (Date mode) | `min={startDate}` |

**Validation on Next:** all 4 fields required.  
**Navigation:** `← Back to trips` link (navigates to `RouteTrips`) | `Next →` button.  
**Progress:** `Step 1 of 3` indicator.

---

### Step 2 — "Confirm details"

A read-only summary card at the top shows: trip name + region + date range.

**Fields (pre-filled from Step 1 region via `getDefaultTimezoneForRegion` / `getDefaultCurrencyForRegion`):**
| Field | Component | Pre-fill source |
|---|---|---|
| Destination timezone | `TimeZoneSelect` | `getDefaultTimezoneForRegion(region)` |
| Destination currency | `CurrencySelect` | `getDefaultCurrencyForRegion(region)` |
| Origin currency | `CurrencySelect` | User's browser locale (`Intl.DateTimeFormat().resolvedOptions().locale`), or last trip's `originCurrency` from Zustand store |

**UX framing:** Heading reads "Here's what we guessed — does this look right?"  
**Validation on Next:** all 3 fields required.  
**Navigation:** `← Back` | `Next →`.

---

### Step 3 — "How are you getting there?"

#### Travel mode selector

Large icon cards in a horizontal row:

| Card | Icon | Label | State |
|---|---|---|---|
| Flying | ✈️ | Flying | Selectable |
| Other | 🚌 | Other *(Coming soon)* | Disabled, grayed out |

#### If "Flying" is selected

Two lightweight flight sub-forms appear below the selector. Each is individually skippable.

**Outbound flight** sub-form (labeled "Outbound flight"):
| Field | Notes |
|---|---|
| Flight number | `TextField.Root`, e.g. `SQ123` |
| Departure date + time | `DateTimePicker` (DateTime mode), timezone = user's origin (browser locale TZ) |
| Arrival date + time | `DateTimePicker` (DateTime mode), timezone = trip's destination timezone (from step 1) |

**Return flight** sub-form (labeled "Return flight"):
| Field | Notes |
|---|---|
| Flight number | `TextField.Root` |
| Departure date + time | `DateTimePicker` (DateTime mode), timezone = trip's destination timezone |
| Arrival date + time | `DateTimePicker` (DateTime mode), timezone = user's origin (browser locale TZ) |

Each sub-form has a "Skip this flight" link to set it to `null`.

**Bottom link:** "Skip — I'll add flights later" skips all of step 3.

**Navigation:** `← Back` | `Create Trip` button.

#### On "Create Trip"

Execution order (all errors handled with a toast):
1. `dbAddTrip(...)` → returns `newTripId`
2. If outbound flight entered: `dbAddActivity({ title: flightNumber, flags: ActivityFlag.IsFlight, ... }, { tripId: newTripId })`
3. If return flight entered: `dbAddActivity({ title: flightNumber, flags: ActivityFlag.IsFlight, ... }, { tripId: newTripId })`
4. `setLocation(RouteTrip.asRouteTarget(newTripId))`

Flight activity fields:
- `title`: flight number string
- `icon`: `'✈️'`
- `flags`: `ActivityFlag.IsFlight` (= `4`)
- `timestampStart` / `timestampEnd`: from departure/arrival DateTimes
- `timeZoneStart` / `timeZoneEnd`: departure / arrival timezones respectively
- `location` / `locationDestination`: empty string (user can fill in from trip page)

---

### Progress Indicator

A simple `Step X of 3` text + three dot indicators at the top of the page. No fancy animation required.

---

### Responsive / Layout

- Uses `Container` (same as other pages) with `maxWidth` constrained to ~`480px` or `CommonLargeDialogMaxWidth`
- On mobile, steps stack naturally (no side-by-side panels)

---

### Files to Create

| File | Description |
|---|---|
| `src/Trip/TripNew/PageTripNew.tsx` | Full-page wizard component (lazy-loaded) |
| `src/Trip/TripNew/PageTripNew.module.css` | CSS module for wizard layout |
| `src/Trip/TripNew/wizardReducer.ts` | `WizardState`, `WizardAction`, `wizardReducer`, `createInitialWizardState` — pure, no React deps |
| `src/Trip/TripNew/wizardReducer.test.ts` | Unit tests for the reducer |

### Files to Modify

| File | Change |
|---|---|
| `src/Routes/routes.ts` | Add `RouteTripNew` |
| `src/App.tsx` | Register `PageTripNew` route before `RouteTrip` |
| `src/Trips/PageTrips.tsx` | Replace `pushDialog(TripNewDialog, ...)` with `setLocation(RouteTripNew.asRouteTarget())` |

### Files Unchanged

- `src/Trip/TripDialog/TripNewDialog.tsx` — kept but no longer used from `PageTrips`
- `src/Trip/TripForm.tsx` — unchanged, still used by edit flow
- All flight/activity DB functions — unchanged, reused as-is

---

## Open Questions

- Should `RouteTripNew` require auth? Yes — same guard as other trip routes. Unauthenticated users hitting `/trip/new` should be redirected to login (existing auth guard behavior).
- Should the wizard be accessible from a URL directly? Yes — it's a full route, so deep-linking and browser back/forward work naturally.
