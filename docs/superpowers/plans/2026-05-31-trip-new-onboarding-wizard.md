# Trip New Onboarding Wizard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-dialog "New Trip" form with a 3-step full-page wizard at `/trip/new` that guides users through trip basics → detail confirmation → optional flight capture.

**Architecture:** A new lazy-loaded page `PageTripNew` owns all wizard state via `useReducer`. The reducer (`wizardReducer.ts`) is pure and co-located for easy unit testing. On final submit the page calls existing `dbAddTrip` and `dbAddActivity` functions then navigates to the new trip.

**Tech Stack:** React 19, TypeScript strict, Wouter routing, Radix UI Themes, Luxon DateTime, InstantDB (`@instantdb/core`), Zustand, Vitest + Testing Library, CSS Modules, Biome linting.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/Trip/TripNew/wizardReducer.ts` | **Create** | Pure state: `WizardState`, `WizardAction`, `wizardReducer`, `createInitialWizardState` |
| `src/Trip/TripNew/wizardReducer.test.ts` | **Create** | Unit tests for reducer — no React, no DOM |
| `src/Trip/TripNew/PageTripNew.tsx` | **Create** | Full-page wizard component (lazy-loaded default export) |
| `src/Trip/TripNew/PageTripNew.module.css` | **Create** | Wizard layout styles |
| `src/Routes/routes.ts` | **Modify** | Add `RouteTripNew` before `RouteTrip` |
| `src/App.tsx` | **Modify** | Register `PageTripNew` route (must be before `RouteTrip`) |
| `src/Trips/PageTrips.tsx` | **Modify** | Replace `pushDialog(TripNewDialog, …)` with `setLocation(RouteTripNew.asRouteTarget())` |

---

## Task 1: Add `RouteTripNew` to the route registry

**Files:**
- Modify: `src/Routes/routes.ts`

- [ ] **Step 1: Add the new route constant**

Open `src/Routes/routes.ts` and add after the `RouteTripsPublic` line:

```ts
export const RouteTripNew = createRouteParam('/trip/new', identity);
```

The file already imports `identity` so no new imports are needed.

- [ ] **Step 2: Verify TypeScript compiles**

```
pnpm typecheck
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```
git add src/Routes/routes.ts
git commit -m "feat(routes): add RouteTripNew at /trip/new"
```

---

## Task 2: Create the wizard reducer

**Files:**
- Create: `src/Trip/TripNew/wizardReducer.ts`

- [ ] **Step 1: Create the file**

```ts
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
git add src/Trip/TripNew/wizardReducer.ts
git commit -m "feat(trip-new): add wizardReducer with WizardState and WizardAction types"
```

---

## Task 3: Unit test the reducer

**Files:**
- Create: `src/Trip/TripNew/wizardReducer.test.ts`

- [ ] **Step 1: Write the failing tests first**

```ts
// src/Trip/TripNew/wizardReducer.test.ts
import { DateTime } from 'luxon';
import { describe, test, expect } from 'vitest';
import {
  createInitialWizardState,
  wizardReducer,
  type WizardState,
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
    const next = wizardReducer(BASE, { type: 'SET_TITLE', title: 'Tokyo Trip' });
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
    const withTitle = wizardReducer(BASE, { type: 'SET_TITLE', title: 'My Trip' });
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
    const next = wizardReducer(BASE, { type: 'SET_TIMEZONE', timeZone: 'Europe/London' });
    expect(next.timeZone).toBe('Europe/London');
  });

  test('SET_CURRENCY updates currency', () => {
    const next = wizardReducer(BASE, { type: 'SET_CURRENCY', currency: 'EUR' });
    expect(next.currency).toBe('EUR');
  });

  test('SET_ORIGIN_CURRENCY updates originCurrency', () => {
    const next = wizardReducer(BASE, { type: 'SET_ORIGIN_CURRENCY', originCurrency: 'SGD' });
    expect(next.originCurrency).toBe('SGD');
  });

  test('SET_TRAVEL_MODE updates travelMode', () => {
    const next = wizardReducer(BASE, { type: 'SET_TRAVEL_MODE', travelMode: 'flight' });
    expect(next.travelMode).toBe('flight');
  });

  test('SET_TRAVEL_MODE can be set to null', () => {
    const withFlight = wizardReducer(BASE, { type: 'SET_TRAVEL_MODE', travelMode: 'flight' });
    const next = wizardReducer(withFlight, { type: 'SET_TRAVEL_MODE', travelMode: null });
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
      flight: { flightNumber: 'SQ321', departureDateTime: undefined, arrivalDateTime: undefined },
    });
    const next = wizardReducer(withFlight, { type: 'SET_OUTBOUND_FLIGHT', flight: null });
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
```

- [ ] **Step 2: Run tests to confirm they pass**

```
pnpm test wizardReducer
```

Expected: 16 tests pass, 0 fail.

- [ ] **Step 3: Commit**

```
git add src/Trip/TripNew/wizardReducer.test.ts
git commit -m "test(trip-new): unit tests for wizardReducer"
```

---

## Task 4: Create `PageTripNew` — Step 1 (basics)

**Files:**
- Create: `src/Trip/TripNew/PageTripNew.tsx`
- Create: `src/Trip/TripNew/PageTripNew.module.css`

- [ ] **Step 1: Create the CSS module**

```css
/* src/Trip/TripNew/PageTripNew.module.css */
.page {
  max-width: 480px;
  margin: 0 auto;
  padding: var(--space-4);
}

.progressDots {
  display: flex;
  gap: var(--space-2);
  justify-content: center;
  margin-bottom: var(--space-5);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--gray-5);
}

.dotActive {
  background: var(--accent-9);
}

.travelModeCards {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.travelModeCard {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 2px solid var(--gray-5);
  border-radius: var(--radius-3);
  cursor: pointer;
  background: var(--color-panel-solid);
  font-size: var(--font-size-4);
}

.travelModeCardSelected {
  border-color: var(--accent-9);
  background: var(--accent-2);
}

.travelModeCardDisabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.flightSubform {
  border: 1px solid var(--gray-5);
  border-radius: var(--radius-3);
  padding: var(--space-3);
  margin-top: var(--space-3);
}

.summaryCard {
  background: var(--gray-2);
  border-radius: var(--radius-3);
  padding: var(--space-3);
  margin-bottom: var(--space-4);
}
```

- [ ] **Step 2: Create `PageTripNew.tsx` with step 1 rendered**

```tsx
// src/Trip/TripNew/PageTripNew.tsx
import { Button, Container, Flex, Heading, Select, Text, TextField } from '@radix-ui/themes';
import { useReducer, useId, useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import { DateTimePicker } from '../../common/DatePicker2/DateTimePicker';
import { DateTimePickerMode } from '../../common/DatePicker2/DateTimePickerMode';
import { CurrencySelect } from '../../common/CurrencySelect/CurrencySelect';
import { TimeZoneSelect } from '../../common/TimeZoneSelect/TimeZoneSelect';
import { ALL_CURRENCIES, getDefaultCurrencyForRegion } from '../../data/intl/currencies';
import { REGIONS_LIST } from '../../data/intl/regions';
import { ALL_TIMEZONES, getDefaultTimezoneForRegion } from '../../data/intl/timezones';
import { useBoundStore } from '../../data/store';
import { ActivityFlag } from '../../Activity/activityFlag';
import { dbAddActivity } from '../../Activity/db';
import { RouteTrip, RouteTrips } from '../../Routes/routes';
import { dbAddTrip } from '../db';
import { TripSharingLevel } from '../tripSharingLevel';
import { createInitialWizardState, wizardReducer } from './wizardReducer';
import s from './PageTripNew.module.css';

export default function PageTripNew() {
  const [, setLocation] = useLocation();
  const publishToast = useBoundStore((state) => state.publishToast);

  const [state, dispatch] = useReducer(wizardReducer, undefined, () =>
    createInitialWizardState(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      // Infer origin currency from browser locale
      (() => {
        try {
          const locale = Intl.NumberFormat().resolvedOptions().locale;
          const region = new Intl.Locale(locale).region ?? '';
          return getDefaultCurrencyForRegion(region as never) ?? '';
        } catch {
          return '';
        }
      })(),
    ),
  );

  // Step 1 field IDs
  const idTitle = useId();
  const idRegion = useId();

  const handleRegionChange = useCallback(
    (newRegion: string) => {
      const tz = getDefaultTimezoneForRegion(newRegion);
      const cur = getDefaultCurrencyForRegion(newRegion);
      dispatch({
        type: 'SET_REGION',
        region: newRegion,
        timeZone: (tz && ALL_TIMEZONES.includes(tz) ? tz : state.timeZone),
        currency: (cur && ALL_CURRENCIES.includes(cur) ? cur : state.currency),
      });
    },
    [state.timeZone, state.currency],
  );

  const regionSelect = useMemo(
    () => (
      <Select.Root
        name="region"
        value={state.region}
        onValueChange={handleRegionChange}
        required
      >
        <Select.Trigger id={idRegion} placeholder="Select a region…" />
        <Select.Content>
          {REGIONS_LIST.map(([code, name]) => (
            <Select.Item key={code} value={code}>
              {name}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    ),
    [state.region, idRegion, handleRegionChange],
  );

  const step1Valid =
    state.title.trim() !== '' &&
    state.region !== '' &&
    state.startDate != null &&
    state.endDate != null;

  const step2Valid =
    state.timeZone !== '' && state.currency !== '' && state.originCurrency !== '';

  const [isSubmitting, setIsSubmitting] = useBoundStore === useBoundStore
    ? (() => {
        const [v, s2] = [false, (_: boolean) => {}];
        return [v, s2] as [boolean, (v: boolean) => void];
      })()
    : [false, (_: boolean) => {}];

  // Local submitting state (can't use hooks conditionally — declare here)
  const [submitting, setSubmitting] = [false, (_: boolean) => {}];
  void isSubmitting;
  void setIsSubmitting;
  void submitting;
  void setSubmitting;

  const handleCreateTrip = useCallback(async () => {
    if (!state.startDate || !state.endDate || !state.title || !state.region || !state.currency || !state.originCurrency || !state.timeZone) return;
    // accessed via useBoundStore below, need user id
  }, [state]);
  void handleCreateTrip;

  // --- Render steps ---
  if (state.step === 1) {
    return (
      <Container>
        <div className={s.page}>
          <ProgressDots current={1} />
          <Heading size="6" mb="1">The basics</Heading>
          <Text color="gray" size="2" as="p" mb="4">Tell us where and when you're going.</Text>

          <Flex direction="column" gap="3">
            <Text as="label" htmlFor={idTitle} size="2">Trip name</Text>
            <TextField.Root
              id={idTitle}
              value={state.title}
              onChange={(e) => dispatch({ type: 'SET_TITLE', title: e.target.value })}
              placeholder="e.g. Tokyo Adventure"
              autoFocus
            />

            <Text as="label" htmlFor={idRegion} size="2">Destination region</Text>
            {regionSelect}

            <Text as="label" size="2">Start date</Text>
            <DateTimePicker
              value={state.startDate}
              onChange={(d) => dispatch({ type: 'SET_START_DATE', date: d ?? undefined })}
              mode={DateTimePickerMode.Date}
              name="startDate"
              required
              placeholder="Select start date"
            />

            <Text as="label" size="2">End date</Text>
            <DateTimePicker
              value={state.endDate}
              onChange={(d) => dispatch({ type: 'SET_END_DATE', date: d ?? undefined })}
              mode={DateTimePickerMode.Date}
              name="endDate"
              required
              placeholder="Select end date"
              min={state.startDate}
            />
          </Flex>

          <Flex mt="6" justify="between" align="center">
            <Button variant="ghost" color="gray" onClick={() => setLocation(RouteTrips.asRouteTarget())}>
              ← Back to trips
            </Button>
            <Button disabled={!step1Valid} onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}>
              Next →
            </Button>
          </Flex>
        </div>
      </Container>
    );
  }

  if (state.step === 2) {
    return (
      <Container>
        <div className={s.page}>
          <ProgressDots current={2} />
          <Heading size="6" mb="1">Confirm details</Heading>
          <Text color="gray" size="2" as="p" mb="4">Here's what we guessed — does this look right?</Text>

          <div className={s.summaryCard}>
            <Text weight="bold">{state.title}</Text>
            <Text as="p" size="1" color="gray">
              {REGIONS_LIST.find(([c]) => c === state.region)?.[1] ?? state.region}
              {state.startDate && state.endDate
                ? ` · ${state.startDate.toFormat('d MMM yyyy')} – ${state.endDate.toFormat('d MMM yyyy')}`
                : null}
            </Text>
          </div>

          <Flex direction="column" gap="3">
            <Text as="label" size="2">Destination timezone</Text>
            <TimeZoneSelect
              name="timeZone"
              value={state.timeZone}
              isFormLoading={false}
              handleChange={(tz) => dispatch({ type: 'SET_TIMEZONE', timeZone: tz })}
            />

            <Text as="label" size="2">Destination currency</Text>
            <CurrencySelect
              name="currency"
              value={state.currency}
              isFormLoading={false}
              handleChange={(cur) => dispatch({ type: 'SET_CURRENCY', currency: cur })}
            />

            <Text as="label" size="2">Your home currency</Text>
            <CurrencySelect
              name="originCurrency"
              value={state.originCurrency}
              isFormLoading={false}
              handleChange={(cur) => dispatch({ type: 'SET_ORIGIN_CURRENCY', originCurrency: cur })}
            />
          </Flex>

          <Flex mt="6" justify="between">
            <Button variant="ghost" color="gray" onClick={() => dispatch({ type: 'SET_STEP', step: 1 })}>
              ← Back
            </Button>
            <Button disabled={!step2Valid} onClick={() => dispatch({ type: 'SET_STEP', step: 3 })}>
              Next →
            </Button>
          </Flex>
        </div>
      </Container>
    );
  }

  // Step 3 — placeholder rendered in Task 5
  return (
    <Container>
      <div className={s.page}>
        <ProgressDots current={3} />
        <Heading size="6" mb="4">How are you getting there?</Heading>
        <Button variant="ghost" color="gray" onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}>
          ← Back
        </Button>
      </div>
    </Container>
  );
}

function ProgressDots({ current }: { current: 1 | 2 | 3 }) {
  return (
    <Flex align="center" gap="2" justify="center" mb="5">
      <Text size="1" color="gray">Step {current} of 3</Text>
      <div className={s.progressDots}>
        {([1, 2, 3] as const).map((n) => (
          <div key={n} className={`${s.dot}${n <= current ? ` ${s.dotActive}` : ''}`} />
        ))}
      </div>
    </Flex>
  );
}
```

> **Note:** The `isSubmitting` block above is a placeholder — it will be replaced with a proper `useState` in Task 5. For now the file compiles and renders steps 1 and 2.

- [ ] **Step 3: Typecheck**

```
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```
git add src/Trip/TripNew/PageTripNew.tsx src/Trip/TripNew/PageTripNew.module.css
git commit -m "feat(trip-new): scaffold PageTripNew with steps 1 and 2"
```

---

## Task 5: Complete Step 3 (flight capture) and submit logic

**Files:**
- Modify: `src/Trip/TripNew/PageTripNew.tsx`

- [ ] **Step 1: Replace the full `PageTripNew.tsx` with the complete version**

Replace the entire file content with:

```tsx
// src/Trip/TripNew/PageTripNew.tsx
import {
  Button,
  Container,
  Flex,
  Heading,
  Select,
  Text,
  TextField,
} from '@radix-ui/themes';
import { useCallback, useId, useMemo, useReducer, useState } from 'react';
import { useLocation } from 'wouter';
import { ActivityFlag } from '../../Activity/activityFlag';
import { dbAddActivity } from '../../Activity/db';
import { CurrencySelect } from '../../common/CurrencySelect/CurrencySelect';
import { DateTimePicker } from '../../common/DatePicker2/DateTimePicker';
import { DateTimePickerMode } from '../../common/DatePicker2/DateTimePickerMode';
import { TimeZoneSelect } from '../../common/TimeZoneSelect/TimeZoneSelect';
import {
  ALL_CURRENCIES,
  getDefaultCurrencyForRegion,
} from '../../data/intl/currencies';
import { REGIONS_LIST } from '../../data/intl/regions';
import {
  ALL_TIMEZONES,
  getDefaultTimezoneForRegion,
} from '../../data/intl/timezones';
import { useBoundStore } from '../../data/store';
import { RouteTrip, RouteTrips } from '../../Routes/routes';
import { dbAddTrip } from '../db';
import { TripSharingLevel } from '../tripSharingLevel';
import type { FlightCapture } from './wizardReducer';
import { createInitialWizardState, wizardReducer } from './wizardReducer';
import s from './PageTripNew.module.css';

function inferOriginCurrency(): string {
  try {
    const locale = Intl.NumberFormat().resolvedOptions().locale;
    const region = new Intl.Locale(locale).region ?? '';
    return getDefaultCurrencyForRegion(region as never) ?? '';
  } catch {
    return '';
  }
}

export default function PageTripNew() {
  const [, setLocation] = useLocation();
  const publishToast = useBoundStore((state) => state.publishToast);
  const currentUser = useBoundStore((state) => state.currentUser);

  const [state, dispatch] = useReducer(wizardReducer, undefined, () =>
    createInitialWizardState(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      inferOriginCurrency(),
    ),
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 field IDs
  const idTitle = useId();
  const idRegion = useId();

  const handleRegionChange = useCallback(
    (newRegion: string) => {
      const tz = getDefaultTimezoneForRegion(newRegion);
      const cur = getDefaultCurrencyForRegion(newRegion);
      dispatch({
        type: 'SET_REGION',
        region: newRegion,
        timeZone: tz && ALL_TIMEZONES.includes(tz) ? tz : state.timeZone,
        currency: cur && ALL_CURRENCIES.includes(cur) ? cur : state.currency,
      });
    },
    [state.timeZone, state.currency],
  );

  const regionSelect = useMemo(
    () => (
      <Select.Root
        name="region"
        value={state.region}
        onValueChange={handleRegionChange}
        required
      >
        <Select.Trigger id={idRegion} placeholder="Select a region…" />
        <Select.Content>
          {REGIONS_LIST.map(([code, name]) => (
            <Select.Item key={code} value={code}>
              {name}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    ),
    [state.region, idRegion, handleRegionChange],
  );

  const step1Valid =
    state.title.trim() !== '' &&
    state.region !== '' &&
    state.startDate != null &&
    state.endDate != null;

  const step2Valid =
    state.timeZone !== '' &&
    state.currency !== '' &&
    state.originCurrency !== '';

  const handleCreateTrip = useCallback(async () => {
    if (
      !state.startDate ||
      !state.endDate ||
      !state.title ||
      !state.region ||
      !state.currency ||
      !state.originCurrency ||
      !state.timeZone ||
      !currentUser
    ) {
      return;
    }
    setIsSubmitting(true);
    try {
      const { id: newTripId } = await dbAddTrip(
        {
          title: state.title,
          timeZone: state.timeZone,
          timestampStart: state.startDate.toMillis(),
          timestampEnd: state.endDate.plus({ day: 1 }).toMillis(),
          region: state.region,
          currency: state.currency,
          originCurrency: state.originCurrency,
          sharingLevel: TripSharingLevel.Private,
        },
        { userId: currentUser.id },
      );

      const flightPromises: Promise<unknown>[] = [];

      if (
        state.outboundFlight &&
        state.outboundFlight.flightNumber &&
        state.outboundFlight.departureDateTime &&
        state.outboundFlight.arrivalDateTime
      ) {
        flightPromises.push(
          dbAddActivity(
            {
              title: state.outboundFlight.flightNumber,
              icon: '✈️',
              flags: ActivityFlag.IsFlight,
              timestampStart: state.outboundFlight.departureDateTime.toMillis(),
              timestampEnd: state.outboundFlight.arrivalDateTime.toMillis(),
              timeZoneStart: state.outboundFlight.departureDateTime.zoneName ?? state.timeZone,
              timeZoneEnd: state.outboundFlight.arrivalDateTime.zoneName ?? state.timeZone,
              location: '',
              locationLat: undefined,
              locationLng: undefined,
              locationZoom: undefined,
              locationDestination: '',
              locationDestinationLat: undefined,
              locationDestinationLng: undefined,
              locationDestinationZoom: undefined,
              description: '',
            },
            { tripId: newTripId },
          ),
        );
      }

      if (
        state.returnFlight &&
        state.returnFlight.flightNumber &&
        state.returnFlight.departureDateTime &&
        state.returnFlight.arrivalDateTime
      ) {
        flightPromises.push(
          dbAddActivity(
            {
              title: state.returnFlight.flightNumber,
              icon: '✈️',
              flags: ActivityFlag.IsFlight,
              timestampStart: state.returnFlight.departureDateTime.toMillis(),
              timestampEnd: state.returnFlight.arrivalDateTime.toMillis(),
              timeZoneStart: state.returnFlight.departureDateTime.zoneName ?? state.timeZone,
              timeZoneEnd: state.returnFlight.arrivalDateTime.zoneName ?? state.timeZone,
              location: '',
              locationLat: undefined,
              locationLng: undefined,
              locationZoom: undefined,
              locationDestination: '',
              locationDestinationLat: undefined,
              locationDestinationLng: undefined,
              locationDestinationZoom: undefined,
              description: '',
            },
            { tripId: newTripId },
          ),
        );
      }

      await Promise.all(flightPromises);

      publishToast({
        root: {},
        title: { children: `Trip "${state.title}" created` },
        close: {},
      });

      setLocation(RouteTrip.asRouteTarget(newTripId));
    } catch {
      publishToast({
        root: {},
        title: { children: 'Failed to create trip. Please try again.' },
        close: {},
      });
      setIsSubmitting(false);
    }
  }, [state, currentUser, publishToast, setLocation]);

  // --- Step 1 ---
  if (state.step === 1) {
    return (
      <Container>
        <div className={s.page}>
          <ProgressDots current={1} />
          <Heading size="6" mb="1">
            The basics
          </Heading>
          <Text color="gray" size="2" as="p" mb="4">
            Tell us where and when you're going.
          </Text>

          <Flex direction="column" gap="3">
            <Text as="label" htmlFor={idTitle} size="2">
              Trip name
            </Text>
            <TextField.Root
              id={idTitle}
              value={state.title}
              onChange={(e) =>
                dispatch({ type: 'SET_TITLE', title: e.target.value })
              }
              placeholder="e.g. Tokyo Adventure"
              autoFocus
            />

            <Text as="label" htmlFor={idRegion} size="2">
              Destination region
            </Text>
            {regionSelect}

            <Text as="label" size="2">
              Start date
            </Text>
            <DateTimePicker
              value={state.startDate}
              onChange={(d) =>
                dispatch({ type: 'SET_START_DATE', date: d ?? undefined })
              }
              mode={DateTimePickerMode.Date}
              name="startDate"
              required
              placeholder="Select start date"
            />

            <Text as="label" size="2">
              End date
            </Text>
            <DateTimePicker
              value={state.endDate}
              onChange={(d) =>
                dispatch({ type: 'SET_END_DATE', date: d ?? undefined })
              }
              mode={DateTimePickerMode.Date}
              name="endDate"
              required
              placeholder="Select end date"
              min={state.startDate}
            />
          </Flex>

          <Flex mt="6" justify="between" align="center">
            <Button
              variant="ghost"
              color="gray"
              onClick={() => setLocation(RouteTrips.asRouteTarget())}
            >
              ← Back to trips
            </Button>
            <Button
              disabled={!step1Valid}
              onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}
            >
              Next →
            </Button>
          </Flex>
        </div>
      </Container>
    );
  }

  // --- Step 2 ---
  if (state.step === 2) {
    return (
      <Container>
        <div className={s.page}>
          <ProgressDots current={2} />
          <Heading size="6" mb="1">
            Confirm details
          </Heading>
          <Text color="gray" size="2" as="p" mb="4">
            Here's what we guessed — does this look right?
          </Text>

          <div className={s.summaryCard}>
            <Text weight="bold">{state.title}</Text>
            <Text as="p" size="1" color="gray">
              {REGIONS_LIST.find(([c]) => c === state.region)?.[1] ??
                state.region}
              {state.startDate && state.endDate
                ? ` · ${state.startDate.toFormat('d MMM yyyy')} – ${state.endDate.toFormat('d MMM yyyy')}`
                : null}
            </Text>
          </div>

          <Flex direction="column" gap="3">
            <Text as="label" size="2">
              Destination timezone
            </Text>
            <TimeZoneSelect
              name="timeZone"
              value={state.timeZone}
              isFormLoading={false}
              handleChange={(tz) =>
                dispatch({ type: 'SET_TIMEZONE', timeZone: tz })
              }
            />

            <Text as="label" size="2">
              Destination currency
            </Text>
            <CurrencySelect
              name="currency"
              value={state.currency}
              isFormLoading={false}
              handleChange={(cur) =>
                dispatch({ type: 'SET_CURRENCY', currency: cur })
              }
            />

            <Text as="label" size="2">
              Your home currency
            </Text>
            <CurrencySelect
              name="originCurrency"
              value={state.originCurrency}
              isFormLoading={false}
              handleChange={(cur) =>
                dispatch({ type: 'SET_ORIGIN_CURRENCY', originCurrency: cur })
              }
            />
          </Flex>

          <Flex mt="6" justify="between">
            <Button
              variant="ghost"
              color="gray"
              onClick={() => dispatch({ type: 'SET_STEP', step: 1 })}
            >
              ← Back
            </Button>
            <Button
              disabled={!step2Valid}
              onClick={() => dispatch({ type: 'SET_STEP', step: 3 })}
            >
              Next →
            </Button>
          </Flex>
        </div>
      </Container>
    );
  }

  // --- Step 3 ---
  return (
    <Container>
      <div className={s.page}>
        <ProgressDots current={3} />
        <Heading size="6" mb="1">
          How are you getting there?
        </Heading>
        <Text color="gray" size="2" as="p" mb="4">
          Add your flights so they appear in your trip timeline.
        </Text>

        <Flex gap="3" className={s.travelModeCards}>
          <button
            type="button"
            className={`${s.travelModeCard}${state.travelMode === 'flight' ? ` ${s.travelModeCardSelected}` : ''}`}
            onClick={() =>
              dispatch({
                type: 'SET_TRAVEL_MODE',
                travelMode: state.travelMode === 'flight' ? null : 'flight',
              })
            }
          >
            <span>✈️</span>
            <Text size="2" weight="medium">
              Flying
            </Text>
          </button>
          <div
            className={`${s.travelModeCard} ${s.travelModeCardDisabled}`}
            aria-disabled="true"
          >
            <span>🚌</span>
            <Text size="2" weight="medium">
              Other
            </Text>
            <Text size="1" color="gray">
              Coming soon
            </Text>
          </div>
        </Flex>

        {state.travelMode === 'flight' ? (
          <>
            <FlightSubform
              label="Outbound flight"
              value={state.outboundFlight}
              originTimeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
              destinationTimeZone={state.timeZone}
              isOutbound
              onChange={(f) =>
                dispatch({ type: 'SET_OUTBOUND_FLIGHT', flight: f })
              }
            />
            <FlightSubform
              label="Return flight"
              value={state.returnFlight}
              originTimeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
              destinationTimeZone={state.timeZone}
              isOutbound={false}
              onChange={(f) =>
                dispatch({ type: 'SET_RETURN_FLIGHT', flight: f })
              }
            />
          </>
        ) : null}

        <Flex mt="6" justify="between" align="center">
          <Button
            variant="ghost"
            color="gray"
            onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}
          >
            ← Back
          </Button>
          <Flex gap="3" align="center">
            {state.travelMode === 'flight' ? null : (
              <Button
                variant="ghost"
                color="gray"
                onClick={() => void handleCreateTrip()}
                loading={isSubmitting}
              >
                Skip — add flights later
              </Button>
            )}
            <Button onClick={() => void handleCreateTrip()} loading={isSubmitting}>
              Create Trip
            </Button>
          </Flex>
        </Flex>
      </div>
    </Container>
  );
}

function FlightSubform({
  label,
  value,
  originTimeZone,
  destinationTimeZone,
  isOutbound,
  onChange,
}: {
  label: string;
  value: FlightCapture | null;
  originTimeZone: string;
  destinationTimeZone: string;
  isOutbound: boolean;
  onChange: (flight: FlightCapture | null) => void;
}) {
  const departureZone = isOutbound ? originTimeZone : destinationTimeZone;
  const arrivalZone = isOutbound ? destinationTimeZone : originTimeZone;

  const current: FlightCapture = value ?? {
    flightNumber: '',
    departureDateTime: undefined,
    arrivalDateTime: undefined,
  };

  return (
    <div className={s.flightSubform}>
      <Flex justify="between" align="center" mb="2">
        <Text weight="medium" size="2">
          {label}
        </Text>
        {value !== null ? (
          <Button
            variant="ghost"
            color="gray"
            size="1"
            onClick={() => onChange(null)}
          >
            Skip this flight
          </Button>
        ) : null}
      </Flex>

      <Flex direction="column" gap="2">
        <Text size="2">Flight number</Text>
        <TextField.Root
          value={current.flightNumber}
          placeholder="e.g. SQ123"
          onChange={(e) =>
            onChange({ ...current, flightNumber: e.target.value })
          }
        />

        <Text size="2">Departure ({departureZone})</Text>
        <DateTimePicker
          value={current.departureDateTime}
          onChange={(d) =>
            onChange({ ...current, departureDateTime: d ?? undefined })
          }
          mode={DateTimePickerMode.DateTime}
          placeholder="Select departure"
        />

        <Text size="2">Arrival ({arrivalZone})</Text>
        <DateTimePicker
          value={current.arrivalDateTime}
          onChange={(d) =>
            onChange({ ...current, arrivalDateTime: d ?? undefined })
          }
          mode={DateTimePickerMode.DateTime}
          placeholder="Select arrival"
        />
      </Flex>
    </div>
  );
}

function ProgressDots({ current }: { current: 1 | 2 | 3 }) {
  return (
    <Flex align="center" gap="2" justify="center" mb="5">
      <Text size="1" color="gray">
        Step {current} of 3
      </Text>
      <div className={s.progressDots}>
        {([1, 2, 3] as const).map((n) => (
          <div
            key={n}
            className={`${s.dot}${n <= current ? ` ${s.dotActive}` : ''}`}
          />
        ))}
      </div>
    </Flex>
  );
}
```

- [ ] **Step 2: Typecheck**

```
pnpm typecheck
```

Expected: no errors. If `currentUser` is not on the store state type, check `src/data/store.ts` for the correct selector — likely `state.user` or `state.currentUser`. Adjust the selector accordingly.

- [ ] **Step 3: Commit**

```
git add src/Trip/TripNew/PageTripNew.tsx
git commit -m "feat(trip-new): complete step 3 with flight capture and submit logic"
```

---

## Task 6: Register the route in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the lazy import**

In `src/App.tsx`, after the `PageTripsPublic` lazy import line, add:

```tsx
const PageTripNew = withLoading()(
  React.lazy(() => import('./Trip/TripNew/PageTripNew')),
);
```

- [ ] **Step 2: Add `RouteTripNew` to the route imports**

In the `Routes/routes` import line, add `RouteTripNew`:

```tsx
import {
  RouteAccount,
  RouteAccountUpgrade,
  RouteLanding,
  RouteLogin,
  RoutePrivacy,
  RouteTerms,
  RouteTrip,
  RouteTripNew,
  RouteTrips,
  RouteTripsPublic,
} from './Routes/routes';
```

- [ ] **Step 3: Register the route — BEFORE `RouteTrip`**

In the `<Switch>` block, add the `PageTripNew` route **immediately before** the `<Route path={RouteTrip.routePath}…>` line:

```tsx
<Route path={RouteTripNew.routePath} component={PageTripNew} />
<Route path={RouteTrip.routePath} component={PageTrip} nest />
```

> **Critical:** `/trip/new` must appear before `/trip/:id` in the switch, otherwise Wouter will match `new` as a trip ID.

- [ ] **Step 4: Typecheck**

```
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```
git add src/App.tsx
git commit -m "feat(trip-new): register /trip/new route in App.tsx"
```

---

## Task 7: Wire up the entry point in `PageTrips`

**Files:**
- Modify: `src/Trips/PageTrips.tsx`

- [ ] **Step 1: Replace `pushDialog` call with navigation**

In `src/Trips/PageTrips.tsx`, find the `Trips` component. It currently does:

```tsx
const pushDialog = useBoundStore((state) => state.pushDialog);
// …
onClick={() => {
  if (user) {
    pushDialog(TripNewDialog, { user });
  }
```

Replace:
1. Remove `pushDialog` from the `useBoundStore` call.
2. Add `useLocation` import from wouter: `import { Link, useLocation, type RouteComponentProps } from 'wouter';`
3. Add `RouteTripNew` to the routes import.
4. Replace the button's `onClick` with:

```tsx
const [, setLocation] = useLocation();
// …
onClick={() => setLocation(RouteTripNew.asRouteTarget())}
```

- [ ] **Step 2: Remove now-unused `TripNewDialog` import** (Biome will flag it as an error)

Remove the line:
```tsx
import { TripNewDialog } from '../Trip/TripDialog/TripNewDialog';
```

- [ ] **Step 3: Typecheck and lint**

```
pnpm typecheck
pnpm biome:check
```

Expected: no errors or unused-import warnings.

- [ ] **Step 4: Commit**

```
git add src/Trips/PageTrips.tsx
git commit -m "feat(trip-new): replace pushDialog with /trip/new navigation in PageTrips"
```

---

## Task 8: Manual smoke test

- [ ] **Step 1: Start dev server**

```
pnpm dev
```

- [ ] **Step 2: Verify the wizard flow end-to-end**

1. Navigate to the Trips page.
2. Click the "New trip" button — confirm you land at `/trip/new`, not a dialog.
3. Step 1: Fill in name, region, start + end date → click "Next →".
4. Step 2: Confirm timezone + currencies are pre-filled from the region → click "Next →".
5. Step 3: Select "Flying", enter an outbound flight number + times → click "Create Trip".
6. Confirm redirect to the new trip page.
7. Confirm the outbound flight activity appears in the trip timeline.
8. Repeat step 5–7 with "Skip — add flights later" to confirm the trip is created without flights.
9. Browser back from step 3 → step 2 → step 1 should work (state is preserved in `useReducer`).

- [ ] **Step 3: Run test suite**

```
pnpm test
```

Expected: all tests pass, including `wizardReducer.test.ts`.

- [ ] **Step 4: Final commit**

```
git add -A
git commit -m "feat(trip-new): onboarding wizard complete — /trip/new with 3-step flow and flight capture"
```
