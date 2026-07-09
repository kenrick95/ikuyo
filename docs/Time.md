# Convention regarding time

## Precision

In this section, assume time zone is UTC

There are two type date/time precision:

- Day. Applies to Trip, Macroplan. e.g. "1 January 2025"
- Minute. Applies to Activity, Accommodation, Expense, Comment. e.g. "1 January 2025 00:15"

For Day-level precision,
- timestampStart --> saved as the midnight of the first day
- timestampEnd --> saved as the midnight after the final day

So for example, a trip that happened 1 January 2025 to 10 January 2025
- timestampStart: 1 Jan 2025 00:00:00
- timestampEnd: 11 Jan 2025 00:00:00

Note: in some form props, the convention is to minus 1 minute from timestampEnd, so be careful regarding form validation since we might have already transformed the time

## Time zone

Time zone is saved as different field, each entity can control its own time zone, by convention fall back to trip's time zone.

When user changes time zone, assume it's changing the time zone only and keep the 'wall clock' the same. That is, if my current time is 12:00 at UTC+8 and if I change my time zone to UTC+9, I expect my time to still be shown as 12:00 and not 11:00

This is usually source of bugs regarding activity/macroplan/accommodation not aligning properly in timetable/list view

The problem usually comes from interaction with date/time picker and time zone, since date/time picker may or may not return timestamp that has time zone information embedded in it (it's easy to make mistake here)... Ideally, date/time picker should return a 'wall clock' (i.e. time string that are not timestamp and not affected by time zone)

