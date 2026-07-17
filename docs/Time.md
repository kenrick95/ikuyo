# Convention regarding time

## Precision

In this section, assume time zone is UTC

There are two type date/time precision:

- Day. Applies to Trip, Macroplan. e.g. "1 January 2025" --> PlainDate
- Minute. Applies to Activity, Accommodation, Expense, Comment. e.g. "1 January 2025 00:15" --> PlainDateTime

In database, the start/end are saved as timestamp in milliseconds for both scenarios

For Day-level precision:
- timestampStart --> saved as the midnight of the first day
- timestampEnd --> saved as the midnight after the final day

So for example, a trip that happened 1 January 2025 to 10 January 2025
- timestampStart: 1 Jan 2025 00:00:00
- timestampEnd: 11 Jan 2025 00:00:00

Note: in some components prop with Day-level precision, the 'end' is actually final day

## Time zone

Time zone is saved as different field, each entity can control its own time zone, by convention fall back to trip's time zone.

## Components

In FE component, it could take as props:

- Temporal.PlainDate
- Temporal.PlainDateTime
- Temporal.ZonedDateTime

Generally, pass it in as plain date/datetime and time zone as different field; and then construct a ZonedDateTime with those two information inside the component

## ZonedDateTime

### Comparison

When doing precise calculations, prefer to convert everything to ZonedDateTime

Temporal cannot do `<`, `<=`, `===`, `>`, `>=` operations, must use `Temporal.ZonedDateTime.compare(one, two)` which returns `-1`, `0`, or `1`

Generally `one <op> two` is equivalent to `Temporal.ZonedDateTime.compare(one, two) <op> 0`

Example `one < two` is equivalent to `Temporal.ZonedDateTime.compare(one, two) < 0`

### Duration

When doing duration calculation, `this.since(other)` or `this.until(other)`.

Be careful about the time zones of `this` and `other`. Because the concept of 'calendar unit' where day/week/month/year have uneven lenghts, Temporal will throw RangeError if largestUnit is days or larger AND time zones of `this` and `other` are different.
