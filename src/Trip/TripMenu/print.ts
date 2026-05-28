import { DateTime } from 'luxon';
import { AccommodationDisplayTimeMode } from '../../Accommodation/AccommodationDisplayTimeMode';
import { ActivityType, getActivityType } from '../../Activity/activityType';
import { groupActivitiesByDays } from '../../Activity/eventGrouping';
import type {
  TripSliceAccommodation,
  TripSliceActivity,
  TripSliceActivityWithTime,
  TripSliceMacroplan,
  TripSliceTrip,
} from '../store/types';

function esc(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>');
}

function formatDate(timestamp: number, timeZone: string): string {
  return DateTime.fromMillis(timestamp)
    .setZone(timeZone)
    .toFormat('d LLLL yyyy');
}

function formatTime(
  timestamp: number,
  timeZone: string,
  tripTimeZone: string,
): string {
  const dt = DateTime.fromMillis(timestamp).setZone(timeZone);
  const time = dt.toFormat('HH:mm');
  if (timeZone !== tripTimeZone) {
    return `${time} (${timeZone})`;
  }
  return time;
}

function renderMacroplan(
  macroplan: TripSliceMacroplan,
  tripTimeZone: string,
): string {
  const startTz = macroplan.timeZoneStart ?? tripTimeZone;
  const endTz = macroplan.timeZoneEnd ?? tripTimeZone;
  const startDate = formatDate(macroplan.timestampStart, startTz);
  // timestampEnd is exclusive (midnight of the day after)
  const endDate = formatDate(macroplan.timestampEnd - 1, endTz);
  const dateRange =
    startDate === endDate ? startDate : `${startDate} – ${endDate}`;
  return `
    <div class="card macroplan">
      <div class="card-tag">Day Plan</div>
      <div class="card-title">${esc(macroplan.name)}</div>
      <div class="card-meta">${dateRange}</div>
      ${macroplan.notes ? `<div class="card-notes">${esc(macroplan.notes)}</div>` : ''}
    </div>`;
}

function renderAccommodation(
  accommodation: TripSliceAccommodation,
  displayTimeMode: AccommodationDisplayTimeMode,
  tripTimeZone: string,
): string {
  const checkInTz = accommodation.timeZoneCheckIn ?? tripTimeZone;
  const checkOutTz = accommodation.timeZoneCheckOut ?? tripTimeZone;

  let timeLine = '';
  if (displayTimeMode === AccommodationDisplayTimeMode.CheckIn) {
    timeLine = `<div class="card-meta">Check in: ${formatTime(accommodation.timestampCheckIn, checkInTz, tripTimeZone)}</div>`;
  } else if (displayTimeMode === AccommodationDisplayTimeMode.CheckOut) {
    timeLine = `<div class="card-meta">Check out: ${formatTime(accommodation.timestampCheckOut, checkOutTz, tripTimeZone)}</div>`;
  }

  return `
    <div class="card accommodation">
      <div class="card-tag">Accommodation</div>
      <div class="card-title">${esc(accommodation.name)}</div>
      ${accommodation.address ? `<div class="card-meta">${esc(accommodation.address)}</div>` : ''}
      ${timeLine}
      ${accommodation.phoneNumber ? `<div class="card-meta">Phone: ${esc(accommodation.phoneNumber)}</div>` : ''}
      ${accommodation.notes ? `<div class="card-notes">${esc(accommodation.notes)}</div>` : ''}
    </div>`;
}

function renderActivity(
  activity: TripSliceActivityWithTime,
  tripTimeZone: string,
): string {
  const startTz = activity.timeZoneStart ?? tripTimeZone;
  const endTz = activity.timeZoneEnd ?? tripTimeZone;
  const isFlight = getActivityType(activity.flags) === ActivityType.Flight;
  const tag = isFlight ? 'Flight' : 'Activity';
  const icon = activity.icon ?? '';
  const location =
    isFlight && activity.locationDestination
      ? `${activity.location ?? ''} → ${activity.locationDestination}`
      : (activity.location ?? '');

  return `
    <div class="card activity">
      <div class="card-tag">${tag}</div>
      <div class="card-title">${icon ? `${esc(icon)} ` : ''}${esc(activity.title)}</div>
      <div class="card-meta">${formatTime(activity.timestampStart, startTz, tripTimeZone)} – ${formatTime(activity.timestampEnd, endTz, tripTimeZone)}</div>
      ${location ? `<div class="card-meta">${esc(location)}</div>` : ''}
      ${activity.description ? `<div class="card-notes">${esc(activity.description)}</div>` : ''}
    </div>`;
}

export function tripToHtml(
  trip: TripSliceTrip,
  activities: TripSliceActivity[],
  accommodations: TripSliceAccommodation[],
  macroplans: TripSliceMacroplan[],
): string {
  const dayGroups = groupActivitiesByDays({
    trip,
    activities,
    accommodations,
    macroplans,
  });

  const tripStart = formatDate(trip.timestampStart, trip.timeZone);
  // timestampEnd is exclusive (midnight of the day after the last day)
  const tripEnd = formatDate(trip.timestampEnd - 1, trip.timeZone);
  const dateRange =
    tripStart === tripEnd ? tripStart : `${tripStart} – ${tripEnd}`;

  const daysHtml = dayGroups.inTrip
    .map((dayGroup, i) => {
      const dayNumber = i + 1;
      const dayLabel = dayGroup.startDateTime.toFormat('cccc, d LLLL yyyy');
      const cards: string[] = [];

      for (const macroplan of dayGroup.macroplans) {
        cards.push(renderMacroplan(macroplan, trip.timeZone));
      }
      for (const accommodation of dayGroup.accommodations) {
        const props = dayGroup.accommodationProps.get(accommodation.id);
        cards.push(
          renderAccommodation(
            accommodation,
            props?.displayTimeMode ?? AccommodationDisplayTimeMode.None,
            trip.timeZone,
          ),
        );
      }
      for (const activity of dayGroup.activities) {
        cards.push(renderActivity(activity, trip.timeZone));
      }

      return `
      <section class="day">
        <h2 class="day-heading">Day ${dayNumber} &mdash; ${dayLabel}</h2>
        ${cards.length > 0 ? cards.join('') : '<p class="empty">No activities planned.</p>'}
      </section>`;
    })
    .join('');

  const today = DateTime.now().toFormat('d LLLL yyyy');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(trip.title)} — Trip Itinerary</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; font-size: 12pt; color: #111; background: #fff; }
  @page { margin: 1.2cm 1.5cm; }
  .trip-header { margin-bottom: 2em; border-bottom: 2px solid #111; padding-bottom: 0.8em; }
  .trip-header h1 { font-size: 22pt; }
  .trip-header .trip-dates { font-size: 11pt; color: #555; margin-top: 0.3em; }
  .trip-header .trip-tz { font-size: 9pt; color: #888; margin-top: 0.2em; }
  .day { margin-bottom: 1.8em; }
  .day-heading { font-size: 14pt; background: #f0f0f0; padding: 0.4em 0.6em; border-left: 4px solid #333; margin-bottom: 0.8em; break-after: avoid; }
  .card { margin: 0.5em 0 0.5em 1em; padding: 0.5em 0.7em; border-left: 3px solid #ccc; break-inside: avoid; }
  .card.macroplan { border-color: #6e7fc3; }
  .card.accommodation { border-color: #4caf8a; }
  .card.activity { border-color: #e07b39; }
  .card-tag { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 0.15em; }
  .card-title { font-size: 11pt; font-weight: bold; }
  .card-meta { font-size: 10pt; color: #444; margin-top: 0.2em; }
  .card-notes { font-size: 9.5pt; color: #666; margin-top: 0.3em; }
  .empty { font-size: 10pt; color: #aaa; margin-left: 1em; }
  .footer { margin-top: 2em; border-top: 1px solid #ccc; padding-top: 0.5em; font-size: 9pt; color: #aaa; }
</style>
</head>
<body>
<div class="trip-header">
  <h1>${esc(trip.title)}</h1>
  <div class="trip-dates">${dateRange}</div>
  <div class="trip-tz">${esc(trip.timeZone)}</div>
</div>
${daysHtml}
<div class="footer">Exported from Ikuyo on ${today}</div>
</body>
</html>`;
}

export function printTrip(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  iframe.srcdoc = html;
  iframe.addEventListener('load', () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 1000);
  });
}
