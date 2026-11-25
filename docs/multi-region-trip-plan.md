# Multi-region trip technical design

Draft · Based on `main` at `940dcbc`

A trip starts with one destination. Travelers can add more destinations in the creation wizard or under **Edit trip**. Each added destination gives new items a local time zone and currency from its start onward. A viewer can change the clock used in Timetable and List from the existing header.

## Destinations and Day plans

Destinations form an ordered itinerary. A Day plan is an optional, whole-day planning note with its own name and date range. Day plans can overlap. They can cover part of a destination or span several destinations. Reuse the date picker and itinerary span layout for destinations. Keep the Day plan form and records independent. An existing Day plan can supply a draft name and start date through **Add destination from Day plan**. The user still selects a place. [Current Day plan model](../src/Macroplan/db.ts)

The first destination uses the existing trip region, time zone, and destination currency. Each additional destination has a place, a time zone, a currency, and a start. A city is useful in regions with several time zones. For example, New York and Los Angeles are separate destinations with USD as the default in both.

## Creation wizard and trip editor

The current wizard asks for a destination region, shows the trip defaults, and offers outbound and return travel. The **Next** path keeps those steps. **Add another destination** opens a branch with the initial destination already in place. The branch uses the same destination editor as **Edit trip**. [Current trip wizard](../src/Trip/TripNew/PageTripNew.tsx)

### Wizard entry

```text
New trip

Trip name                     [ Japan and Taiwan       ]
Destination Region / Country  [ Japan                ▾ ]
Origin Region / Country       [ Singapore            ▾ ]
Dates                         [ 3 May ] to [ 10 May    ]

                 [ Add another destination ] [ Next → ]
```

The branch shows the destinations in start order. The first row uses the trip start date. After the user selects a place, the row shows the editable time zone and currency.

If the region spans several time zones, the place supplies the time zone where available. If the place lookup lacks a zone, the user selects one.

### Destinations step

```text
Destinations

Japan                         3 May · Trip start
Asia/Tokyo · JPY                              [ Edit ]

Taipei, Taiwan                6 May
Asia/Taipei · TWD                             [ Edit ]

[ Add destination ]

Origin currency               [ SGD                  ▾ ]

[ ← Back ]                                   [ Next → ]
```

The travel step uses the first destination for outbound arrival and the last destination for return departure. It uses the corresponding zones for each endpoint. Users can create the trip with dates alone and add transport later. If a user cancels the multi-region branch, the wizard restores the single-destination draft.

### Edit an additional destination

```text
Edit destination

Place       [ Taipei, Taiwan                         ]
Starts      [ 6 May, 15:40             ] [ Use arrival ]
            Tokyo → Taipei · 6 May, 15:40
Time zone   [ Asia/Taipei                           ▾ ]
Currency    [ TWD                                   ▾ ]

[ Remove destination ]                     [ Done ]
```

In **Edit trip**, **Add destination** starts with the existing destination as the first row. **Done** changes the edit draft. **Save** applies the itinerary and trip details together. The itinerary can show a destination start in the day header, such as **15:40 · Taipei**, in the selected display zone. The Day plan row stays available for planning notes.

## When a destination starts

- A date starts at the beginning of that day in the destination time zone. A traveler can use a time to split a travel day.
- **Use arrival** offers existing, dated flight or train arrivals in the trip. It copies the arrival time into the destination start. Later changes to the transport leave that start in place. The user can apply **Use arrival** again to move it.
- For a confirmed instant, the active destination is the latest destination whose start is at or before that instant. The first and last destinations supply defaults on the outer edges of the trip.
- Two added destinations cannot start at the same instant. A return to Japan after Taipei is a new destination with a later start.
- If the user removes a destination, the previous destination applies until the next start. If they remove all added destinations, the trip returns to the single-destination flow. Saved items keep their values.

## Defaults for new items

A common resolver takes the itinerary and the context of the new item. A destination choice takes priority. An unambiguous place match is next, then the start that applies to the item time. If the same place occurs several times, the item time selects among those visits. If the context leaves more than one valid destination, the form shows a **Destination** picker.

If a timetable cell supplies a time, the resolver starts from that instant. If a form supplies a local date and time, the resolver evaluates it in each candidate destination zone. If the whole local day falls in one destination, the date alone selects it. On a split day, the time, place, or destination picker resolves the choice. With no date or place, the form uses the first destination until more context becomes available.

| New item | Initial values |
| --- | --- |
| Activity | Use the destination zone for the start and end. An explicit second place can supply the end zone. |
| Flight or train | Resolve departure and arrival separately from the endpoints and times. Each endpoint remains editable. |
| Accommodation | Use the property zone for check-in and checkout, including a checkout after the next destination starts. |
| Expense | Use the destination currency and incurred time zone. Offer the time-zone control in multi-region trips. |

```text
New expense

Date incurred  [ 7 May, 12:30                   ]
Time zone      [ Asia/Taipei                   ▾ ]
Title          [ Lunch                         ]
Amount         [             ] [ TWD          ▾ ]
```

For a new draft, Ikuyo can update untouched defaults as the date or place changes. A manual currency or zone choice wins. After an expense has an amount, exchange rate, or split, currency changes require an explicit choice. A manual change uses the existing amount and split validation. A date or destination change never reuses an exchange rate from another currency pair.

For single-destination trips, use the existing defaults, including the remembered expense currency. For a new local expense in a multi-region trip, the destination currency takes priority over that remembered value. Origin currency retains its role in spending summaries. Refunds take the original expense currency. Ledger balances and settlements keep their current currency rules. [Current expense form](../src/Expense/ExpenseInlineCardForm.tsx) · [Expense ledger design](expense-splitting-plan.md)

Saved items use their stored timestamps, time zones, and currencies. Legacy items that lack a zone still use the trip time zone. Edits to a destination affect later prefills.

## Timetable and List time zone

Use the existing time-zone label as the selector. Offer the trip time zone and each distinct destination time zone. When only one zone exists, show the label. Store the selected zone as a personal preference for this trip. If a selected zone leaves the itinerary, use the trip time zone. [Current trip header](../src/Trip/TripNavbar/TripNavbar.tsx)

```text
[ Timetable ▾ ]                         [ Taipei time ▾ ]
                                        ┌────────────────┐
                                        │   Tokyo time   │
                                        │ ✓ Taipei time  │
                                        └────────────────┘

5 May                                    6 May
23:30  Late check-in                     08:00  Breakfast
```

The selected zone controls the hour axis, the day headings, and placement in both views. For example, `6 May 00:30` in Tokyo appears under `5 May 23:30` in Taipei. Day plan date labels use their own zones. Flight and train details keep the local time at each endpoint. The trip home and Expenses headers continue to use the trip time zone.

A click on a cell passes an instant to the new-item form. For example, a `23:30` Taipei slot can open a Tokyo item at `00:30` the next day. An activity drop also resolves the target cell to an instant and keeps the saved endpoint zones. The view must use the same conversion for placement, clicks, drops, and the current-time marker. On a daylight saving transition, the grid must distinguish repeated hours by offset and exclude cells for skipped times.

The original trip date range still uses the trip time zone. Build the visible days from that range in the selected view zone. Keep the existing treatment of items on either side of the trip, so timed entries remain reachable after a date changes in the view.

## Storage and API

Store added destinations in a nullable JSON column on `trips`. Each destination is a separate record in the array. They belong to the trip and share a save operation. The data has no dependency on Day plan records. A trip without additional destinations needs no backfill or mode flag.

| Field in an added destination | Value |
| --- | --- |
| `id` | Stable ID within the trip |
| `name`, `region` | Place label and region code |
| `timeZone`, `currency` | IANA time-zone ID and currency code |
| `startsOn`, `startsAtTime` | Local date and optional local time in the destination zone |
| `startOffset` | Selected UTC offset for a repeated local time |
| `startsAtMs` | Instant resolved by Temporal in the browser, used for ordering and prefill |

The editor resolves the instant with Temporal and sends it in the trip save request. If a local time repeats, the editor asks the user to choose an offset. If a local time falls in a clock gap, the editor asks for a valid time.

The server verifies identifiers, supported zones and currencies, and that submitted instants are unique and strictly inside the trip bounds. It stores the submitted instants. If trip dates change, the server checks the instants against the proposed dates. If the dates exclude a destination, the editor identifies the row the user must move or remove.

Extend the existing trip create, update, and full-trip read contracts with `destinations`. Omission in an update keeps the current itinerary. An empty array clears the added destinations. The create path saves trip details and destinations in one transaction. Optional transport records use the existing post-create flow. If optional transport fails, keep the trip and offer a retry for the failed entries using the same IDs.

The trip editor sends the destination list only after the user edits it.

Existing trip edit permissions, archive rules, and read visibility apply. The full trip API, store, and sync carry the itinerary to viewers with trip access. Trip listing payloads need only the existing summary fields.

When duplicating a trip to new dates, the browser shifts each start by the trip date change in local calendar days, resolves it in the destination's zone, and sends it in the duplicate request. The server assigns fresh destination IDs. If a shifted start is ambiguous, falls in a clock gap, or falls outside the new dates, the duplicate dialog identifies the affected destination before sending the request.

## Implementation and verification

1. Add the trip migration, API validation, sync mapping, and duplication support.
2. Add the destination editor to **Edit trip** and the opt-in wizard branch. Reuse the date, currency, and time-zone controls.
3. Apply the resolver to new activities, transport, accommodations, and expenses. Pass explicit date and time context from their entry points.
4. Share a display-zone adapter between the Timetable and List. Apply it to day grouping and grid interactions before adding the header selector.

| Area | Acceptance checks |
| --- | --- |
| Single destination | Normal wizard path, expense defaults, day grouping, and Day plans behave as before. Older clients can update other trip fields without clearing destinations. |
| Destination changes | Cover a domestic zone change, a cross-border train, a return visit, an arrival copy, and removal of all added destinations. Verify defaults before, at, and after arrival. |
| Item forms | Add a late expense for an earlier stop. Verify manual choices, currency locks, refund currency, and both transport endpoint zones. |
| Itinerary views | Verify cross-midnight grouping, clock changes, click and drop behavior, and the same selected zone in both views. Verify keyboard and narrow-screen access. |
| Trip lifecycle | Verify create and update contracts, sync, read and edit permissions, archives, and duplicate date shifts. |

The additive migration uses the existing `php scripts/deploy/deploy.php` workflow. The deployment controller keeps its manual gate for pending migrations and incomplete deployments. Builds without pending migrations retain automatic single-copy rsync deployment.

## Browser captures

The screenshots use a fictional Tokyo and Taipei itinerary. The browser check covers creation, arrival capture, cross-midnight placement, and draft expense defaults.

[Mock data screenshots](screenshots/multi-region-trip/) · [Browser check](../scripts/qa/multi-region-flow.mjs)
