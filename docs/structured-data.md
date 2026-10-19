# Structured data

Ikuyo uses schema.org JSON-LD to describe public pages and trip schedules.
JSON-LD is JSON that identifies entities and their relationships.
The metadata uses existing information and does not depend on a specific consuming application.

## Public pages

The PHP front controller embeds metadata in the initial HTML.
The browser replaces it during navigation, so the metadata follows the current page.
Both paths read the site and app declarations from `shared/structured-data.json`.
Page titles and descriptions come from `shared/pages.json`.

The public-page graph contains these entities:

- `WebSite` identifies Ikuyo and its home URL.
- `WebApplication` describes the trip-planning app and its browser requirement.
- `WebPage` describes the home, landing, privacy, terms, and public trip pages.
- `CollectionPage` describes the public trip directory.

Each page links to the site through `isPartOf`.
The home and landing pages identify the app through `mainEntity`.
A trip page identifies its exported `Trip` through `mainEntity`.
Page and site URLs are absolute. Nested trip views use the canonical trip URL.
The directory does not claim a complete list of trips because its entries load separately and support pagination.

Login, account, administration, and other private or unknown routes receive no public-page graph.
The public trip metadata endpoint continues to reject private trips.
Authorized viewers can still read their private trip metadata in the browser and download their schedules.

## Trip schedules

The trip menu offers "Export trip to JSON-LD".
`GET /api/trips/{trip}/export/jsonld` uses existing trip-view permissions, including private and archived trips.
The download and public metadata share `backend/app/Services/TripStructuredData.php`.
Both responses use `Cache-Control: no-store`.

The download is an array of entities with stable record identifiers:

| Record | schema.org type | Fields |
| --- | --- | --- |
| Trip | [Trip](https://schema.org/Trip) | Name, ordered places, references to transport legs |
| Flight activity | [Flight](https://schema.org/Flight) | Name, departure/arrival times, airports, coordinates, parent trip |
| Train activity | [TrainTrip](https://schema.org/TrainTrip) | Name, departure/arrival times, stations, coordinates, parent trip |
| Other activity | [Event](https://schema.org/Event) | Name, start/end times, location, coordinates |
| Accommodation | Event at a LodgingBusiness | Name, stay dates, lodging address, coordinates |

Transport legs use `partOfTrip`, and the trip references them through `subTrip`.
[Trip.itinerary](https://schema.org/itinerary) contains an `ItemList` of known places ordered by their visit timestamps.
Flight and train stops use departure and arrival times. Other visits use their start time. Stays use their check-in time.
Stops with unknown times remain outside the ordered list, while their activities remain available as separate entities.
Repeated visits stay separate. Equal timestamps retain a deterministic order without implying a known sequence within that instant.
An empty route omits `itinerary` rather than inventing destinations.

Idea activities and deleted records are excluded.
Missing times and locations stay absent.
Dates use ISO 8601 values with the offset for each endpoint's time zone.
An absent or invalid endpoint zone uses the trip zone. An invalid trip zone uses UTC.
The calendar date range of a trip does not establish actual departure or arrival times, so those times are not invented.

The export excludes descriptions, lodging notes, phone numbers, members, comments, expenses, and tasks.
It does not infer service numbers, passengers, booking references, tickets, or confirmation status from free text.
A planned stay is an event at a lodging business rather than a confirmed reservation.
Metadata does not add fields that the trip's access rules withhold.

## Implementation and validation

`app/Metadata/PageStructuredData.php` and `src/Nav/structuredData.ts` assemble page metadata from the shared declarations.
`TagFactory`, `Renderer`, and the browser components manage HTML embedding and navigation.
The PHP renderer escapes user text, including `</script>`. Browser code uses script text content rather than HTML insertion.
Canceled requests cannot restore metadata for a previous trip.
The change adds no migration, host executable, or deployment copies.

Run `php artisan test --filter=TripStructuredDataTest` from `backend/` for trip export and relationship tests.
Run `php scripts/check-trip-jsonld.php` from the repository root for page types, canonical links, exclusions, and safe HTML embedding.
Run the frontend tests for page generation, navigation, access failures, edits, and cleanup.
The PHP rendering checks also run in CI.

Ticket extraction and booking import from issue #44 remain separate features.
They are not prerequisites for schema.org metadata, and consumer-specific compatibility testing is not required for this work.
