# KDE Itinerary integration

Investigation and first export step for [issue #44](https://github.com/kenrick95/ikuyo/issues/44).
Reviewed on 2026-10-19 against main at `fd349b20b46559ae80b558f9feaca61106a9d836`.
The issue remains open because ticket extraction and import require separate work.

## Implemented: trip JSON-LD export

JSON-LD is JSON that identifies data types and their relationships.
Public trip pages include a server-rendered `<script type="application/ld+json">` block.
Clients can read it without running JavaScript.
The browser refreshes this block during navigation and schedule changes.
It removes the block when the trip becomes unavailable or the user leaves the trip page.

The trip menu offers "Export trip to JSON-LD".
The download uses `GET /api/trips/{trip}/export/jsonld` and the existing trip-view permission rules.
Authorized viewers can export private and archived trips.
The public metadata endpoint still refuses private trips, including requests from their owners.
Both paths use `Cache-Control: no-store` and the same serializer.

The output is a JSON array with a schema.org context on each object.
A `Trip` object identifies the plan.
Each activity or stay has a stable identifier based on its Ikuyo record ID.
Records map to these types:

| Ikuyo record | schema.org type | Exported schedule fields |
| --- | --- | --- |
| Flight activity | [`Flight`](https://schema.org/Flight) | Name, departure/arrival times, airports, coordinates |
| Train activity | [`TrainTrip`](https://schema.org/TrainTrip) | Name, departure/arrival times, stations, coordinates |
| Other activity | [`Event`](https://schema.org/Event) | Name, start/end times, location, coordinates |
| Accommodation | `Event` at a `LodgingBusiness` | Name, stay dates, lodging address, coordinates |

Idea activities and deleted records are excluded.
Missing times and locations stay absent.
Dates use ISO 8601 values with the offset for each endpoint's time zone.
An absent or invalid endpoint zone uses the trip zone. An invalid trip zone uses UTC.

The export excludes descriptions, lodging notes, phone numbers, members, comments, expenses, and tasks.
It does not infer service numbers, passengers, booking references, tickets, or confirmation status from free text.
A planned stay is an event at a lodging business, not an invented confirmed reservation.

The shared serializer is `backend/app/Services/TripStructuredData.php`.
The public-page path runs through `MetadataController`, `app/Trip/PublicTrip.php`, `TagFactory`, and `Renderer`.
The renderer escapes embedded JSON, including user text containing `</script>`.
The browser component uses text content instead of HTML insertion.

## What this means for KDE

[KItinerary](https://github.com/KDE/kitinerary/blob/master/README.md) extracts schema.org data from tickets and documents, including structured data in HTML.
The issue asks for that data to enter Ikuyo:

```text
Email / PDF / ticket -> KItinerary extractor -> schema.org JSON -> Ikuyo trip
```

The export goes in the reverse direction.
It provides schedule data for other applications, but it does not parse documents.
No KDE executable was run for this change, so end-to-end KDE import compatibility is not established.

The [KDE type registry](https://github.com/KDE/kitinerary/blob/master/src/lib/jsonlddocument.cpp) includes `Flight`, `TrainTrip`, `Event`, and reservation types.
It does not register generic `Trip` or `TouristTrip` types in the reviewed source.
The export therefore keeps schedule records separate rather than hiding them inside a generic trip object.
KDE can still reject incomplete records through its own validation rules.

The linked [`Trip.itinerary` property](https://schema.org/itinerary) describes destinations, with an `ItemList` for an ordered route.
It is not a ticket format. The first export does not build a destination list.
A JSON Schema describes allowed input structure. It does not extract bookings or establish KDE compatibility.

## Next step: import extracted JSON

Add an "Import booking JSON" action for editors on writable trips.
Start with `FlightReservation`, `TrainReservation`, and `LodgingReservation` files produced by KItinerary.
Let the user review mapped schedule fields before saving anything.
These mappings fit the current models:

- Map `reservationFor: Flight` to a flight activity, with separate departure and arrival places and time zones.
- Map `reservationFor: TrainTrip` to a train activity, with separate stations and time zones.
- Map `LodgingReservation.checkinTime` and `checkoutTime` to accommodation timestamps, with the lodging business name and address.

Ikuyo lacks dedicated fields for reservation identifiers, passengers, seats, ticket tokens, and structured service identifiers.
The preview must disclose any information that it will discard.
Do not append booking secrets to descriptions or lodging notes automatically because shared trips expose those fields.
Full ticket support needs a booking model with access rules and several tickets or passengers per activity.

Keep parsing, field mapping, and saving separate.
Use a documented input subset with limits on file size, record count, and text length.
Report unsupported types, references, contexts, cancellations, and updates explicitly.
Never fetch remote JSON-LD contexts or document URLs during import.

Handle offset times, missing zones, date-only values, and ambiguous daylight-saving times in the preview.
KDE also supports a `QDateTime` object with `@value` and `timezone` in its JSON-LD implementation.
Do not interpret foreign local times in the browser's zone by default.
Warn about dates outside the trip instead of silently shifting them.

Use a dedicated backend request with allowed fields and semantic validation.
The current generic content controller does not provide the full contract that an importer needs.
Preserve authentication, edit permissions, the archive lock, and trip lifecycle serialization.
Use an atomic batch save and a request identifier to prevent duplicate records after retries.
Review potential duplicates without merging distinct passengers or segments solely by reservation identifier.

## Later: extract PDF and email documents

The [KItinerary command-line extractor](https://apps.kde.org/kitinerary-extractor/) is a separate native application.
Its README describes standard input/output, static builds, and Flatpak packaging.
PHP 8.4 support alone does not establish that the shared host can run it.
Before adding direct extraction, test these hosting requirements:

- The host permits PHP process execution.
- A pinned extractor build runs on the host architecture and operating system.
- CPU, memory, temporary-disk space, and execution limits support representative documents.
- The process can enforce timeouts and restricted permissions without unnecessary network access.
- The binary and required files fit the available disk space and can receive updates.

If the host passes, add an authenticated extraction endpoint that returns preview data without saving trip records.
Bound upload size, process output, and execution time.
Delete temporary documents on success, failure, and timeout.
Keep document contents and extracted personal details out of logs and telemetry.

If the host fails, support local extraction followed by JSON import.
An extraction service on another host adds hosting and document-privacy decisions.
Do not upload user bookings to the issue's public demo automatically.
Preserve the single-copy rsync deployment, PHP deployment controller, automatic deployment path, and manual migration authorization gate.
The export step adds no migration or host executable.

## Validation

Run `php artisan test --filter=TripStructuredDataTest` from `backend/` for export coverage.
Run `php scripts/check-trip-jsonld.php` from the repository root for HTML rendering and script-injection coverage.
The frontend tests cover navigation, stale requests, access failures, and cleanup.
Before claiming KDE interoperability, run a pinned extractor against generated JSON and saved HTML.
Import representative results into KDE Itinerary and compare dates, offsets, places, and record counts.
Record the extractor version and reproducible commands in the compatibility PR.
