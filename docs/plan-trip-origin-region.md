# Plan: Trip Origin Country/Region

## Goal

Ask the user for their **origin** (home) country/region for each trip, persist it on the
trip, and use it to:

1. Derive the origin's **time zone** and **currency** (the trip already tracks
   `originCurrency`; an origin region lets us auto-fill it instead of guessing from locale).
2. Improve **geocoding** of the origin side of transport (outbound departure / return
   arrival airports and stations) by scoping MapTiler geocoding to the origin country.

Also persist the origin **region / currency / time zone** as per-user preferences so new
trips can be pre-filled for repeat users.

## Background / current state

- `trip` entity (`instant.schema.ts:76`) has `region` (destination), `currency`
  (destination), `originCurrency` (origin), `timeZone` (destination). There is **no**
  `originRegion`.
- Origin currency is currently guessed from the browser locale
  (`wizardUtils.ts:65 getOriginCurrencyFromLocale`) and defaults to `USD`.
- Wizard (`wizardReducer.ts`, `PageTripNew.tsx`) has 3 steps: (1) trip name / destination
  region / dates, (2) time zone / destination currency / origin currency, (3) transport.
- `TripForm.tsx` (new + edit dialog via `TripEditDialog.tsx`) is the non-wizard form; it
  also manages destination region → auto time zone/currency.
- Geocoding helpers: `geocodingRequest(location, tripRegion)` (Activity), `stationGeocodingRequest`
  (Train), `airportGeocodingRequest` (Flight). Airport/station helpers do **not** scope by
  country — they geocode globally, which causes wrong results (e.g. IATA ambiguity).
- `user` entity (`instant.schema.ts:99`) has no preference fields. `user` DB layer:
  `src/User/db.ts` (`dbCreateUser`, `dbUpdateUser`).

## 1. Schema changes

### `trip` entity — add `originRegion`
```ts
originRegion: i.string().optional(),  // ISO 3166-1 alpha-2, Uppercase, e.g. "SG"
```
Optional for backward compatibility with existing trips that have no origin region set.

### `user` entity — add preference fields
```ts
preferredRegion: i.string().optional(),        // origin region (ISO 3166-1 alpha-2)
preferredCurrency: i.string().optional(),      // origin currency (ISO 4217)
preferredTimeZone: i.string().optional(),      // IANA time zone
```

## 2. Data layer

### `src/Trip/db.ts`
- Extend `DbTrip` with `originRegion: string` (keep non-optional in the type to match
  existing style; DB field optional for old rows).
- `dbAddTrip` / `dbUpdateTrip` already spread the full object — add `originRegion` to the
  payloads in callers. No new db functions required.

### `src/User/db.ts`
- Add optional fields to `DbUser`: `preferredRegion`, `preferredCurrency`,
  `preferredTimeZone`.
- Add a `dbUpdateUserPreferences({ id, region?, currency?, timeZone? })` helper that does a
  `merge` on those fields.
- Optionally accept initial preference values in `dbCreateUser` (from auth-provided locale
  or first trip creation) so first-time users get sensible defaults.

### `src/Trip/store/types.ts` & `deriveState.ts`
- Add `originRegion` to `DbTripQueryReturnType` and to the derived `TripSliceTrip`.

## 3. Wizard changes (`PageTripNew.tsx`, `wizardReducer.ts`, `wizardUtils.ts`)

### State (`wizardReducer.ts`)
- Add `originRegion: string` to `WizardState`.
- Add action `{ type: 'SET_ORIGIN_REGION'; originRegion: string }`.
- In `SET_ORIGIN_REGION`, auto-fill `originCurrency` (and optionally a new `originTimeZone`
  field) using existing helpers:
  - `getDefaultCurrencyForRegion(originRegion)` (currencies.ts)
  - `getDefaultTimezoneForRegion(originRegion)` (timezones.ts)
- `createInitialWizardState` signature: accept user-preferred defaults
  (`{ preferredRegion, preferredCurrency, preferredTimeZone }`) and seed
  `originRegion`, `originCurrency`, and the trip's `timeZone` (trip time zone stays the
  destination; store origin time zone separately if needed for transport pre-fill).

### UI (`PageTripNew.tsx`)
- Step 1: add an "Origin / Home country/region" select (same `REGIONS_LIST` + `Select`
  pattern as the destination region, `PageTripNew.tsx:62`). Label clearly "Origin (where
  you're travelling from)".
- Step 2: `originCurrency` is now auto-filled from origin region; keep the select editable
  but pre-populated. Remove reliance on `getOriginCurrencyFromLocale`.
- Pass `originRegion` in the `dbAddTrip` call (`PageTripNew.tsx:139`).

### Seeding defaults
- `getOriginCurrencyFromLocale()` is superseded by user-preferred currency
  (see section 5). Keep it only as a final fallback.

## 4. TripForm changes (`TripForm.tsx`, `TripEditDialog.tsx`)

- Add `tripOriginRegion` prop to `TripForm`; pass through from `TripEditDialog.tsx:30` (and
  any new-trip caller).
- Add an "Origin's region" `Select` (mirror of destination region field, `TripForm.tsx:313`).
- In `handleRegionChange`-style logic, when origin region changes auto-populate origin
  currency (mirror the destination logic at `TripForm.tsx:109`).
- On submit include `originRegion` in `dbAddTrip`/`dbUpdateTrip` payloads
  (`TripForm.tsx:184`, `TripForm.tsx:207`).
- When editing, only auto-fill origin currency if the user hasn't manually changed it
  (same guard pattern as destination).

## 5. User preferences + defaults

- On successful trip creation (wizard or form), call `dbUpdateUserPreferences` to store
  the chosen origin region/currency/time zone so future trips pre-fill.
- `PageTripNew` and the new-trip `TripForm` read `currentUser.preferred*` from the store to
  seed the wizard/form initial values.
- Extend the `user` store slice / `DbUserQueryReturnType` with the new fields.
- Consider a small "Preferences" section (e.g. in account/settings) to edit these directly
  — optional follow-up, not required for this feature.

## 6. Geocoding improvements

The key win: scope the origin-side geocoding to the origin country.

### `src/Trip/TripNew/FlightSubform.tsx` & `TrainSubform.tsx`
- For the **outbound departure** and **return arrival** fields (the "origin" side), pass the
  trip's `originRegion` to `airportGeocodingRequest` / `stationGeocodingRequest`.
- For the **outbound arrival** and **return departure** fields (the "destination" side), pass
  the trip's `region` (destination) — currently not passed at all.

### `src/Activity/FlightForm/FlightFormGeocoding.ts` & `src/Activity/TrainForm/TrainFormGeocoding.ts`
- Extend signatures: `airportGeocodingRequest(query, country?)` and
  `stationGeocodingRequest(query, country?)`.
- When a country is provided, add `country: [country.toLowerCase()]` to
  `geocodingOptions` (same pattern as `ActivityFormGeocoding.ts:21`).
- If country-scoped search returns nothing, fall back to a global search (current
  behaviour) to avoid regressions.
- This directly fixes the IATA ambiguity noted in `FlightFormGeocoding.ts:30`.

### `src/Map/TripMap.tsx`
- No change required; destination region center lookup already works.

## 7. Tests

- `wizardReducer.test.ts`: cover `SET_ORIGIN_REGION` auto-filling currency/time zone and
  seeding from user preferences.
- `PageTripNew`/`TripForm`: assert origin region is included in `dbAddTrip` payload and
  that origin currency is pre-populated.
- Geocoding helpers: assert `country` param is added to options when provided and that
  fallback to global search works.

## 8. Verification

- `pnpm typecheck`
- `pnpm biome:ci`
- `pnpm test`
- Manual: create a trip via wizard and form; verify origin region saved, origin currency
  auto-filled from region, transport geocoding scoped to origin/destination country, and
  that a second new trip pre-fills from user preferences.

## 9. Out of scope (follow-ups)

- Dedicated account settings UI for preferences.
- Auto-deriving preferences from auth/locale on sign-up.
- Storing origin coordinates / origin city (beyond region) for mapping the origin side.
