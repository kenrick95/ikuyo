import { DateTime } from 'luxon';
import type { DbActivity } from './db';

type ActivityForExport = Pick<
  DbActivity,
  | 'id'
  | 'title'
  | 'location'
  | 'locationLat'
  | 'locationLng'
  | 'locationDestination'
  | 'description'
  | 'timestampStart'
  | 'timestampEnd'
  | 'timeZoneStart'
  | 'timeZoneEnd'
>;

/**
 * Formats a date-time for ICS format (YYYYMMDDTHHMMSS)
 * For all-day events, returns just the date (YYYYMMDD)
 */
function formatIcsDateTime(
  timestamp: number,
  timeZone: string,
  isAllDay = false,
): string {
  const dt = DateTime.fromMillis(timestamp, { zone: timeZone });
  if (isAllDay) {
    return dt.toFormat('yyyyMMdd');
  }
  return dt.toFormat("yyyyMMdd'T'HHmmss");
}

/**
 * Escapes special characters in ICS text fields
 */
function escapeIcsText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Folds long lines according to ICS specification (max 75 octets per line)
 */
function foldLine(line: string): string {
  const maxOctets = 75;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(line);
  if (bytes.length <= maxOctets) {
    return line;
  }

  const result: string[] = [];
  let remaining = line;
  let isFirst = true;

  while (remaining.length > 0) {
    const limit = isFirst ? maxOctets : maxOctets - 1; // account for leading space on continuation lines
    let cutPoint = remaining.length;
    while (encoder.encode(remaining.slice(0, cutPoint)).length > limit) {
      cutPoint--;
    }
    if (
      cutPoint > 0 &&
      cutPoint < remaining.length &&
      remaining.charCodeAt(cutPoint - 1) >= 0xd800 &&
      remaining.charCodeAt(cutPoint - 1) <= 0xdbff &&
      remaining.charCodeAt(cutPoint) >= 0xdc00 &&
      remaining.charCodeAt(cutPoint) <= 0xdfff
    ) {
      cutPoint--;
    }
    result.push((isFirst ? '' : ' ') + remaining.slice(0, cutPoint));
    remaining = remaining.slice(cutPoint);
    isFirst = false;
  }

  return result.join('\r\n');
}

/**
 * Generates a TZID parameter for ICS datetime fields
 */
function getTzidParam(timeZone: string): string {
  return `;TZID=${timeZone}`;
}

/**
 * Converts activities to ICS (iCalendar) format
 */
export function activitiesToIcs(
  activities: ActivityForExport[],
  tripTimeZone: string,
  tripTitle?: string,
): string {
  const now = DateTime.utc().toFormat("yyyyMMdd'T'HHmmss'Z'");

  const events = activities
    .filter(
      (
        activity,
      ): activity is ActivityForExport & {
        timestampStart: number;
        timestampEnd: number;
      } => activity.timestampStart != null && activity.timestampEnd != null,
    )
    .map((activity) => {
      const timeZoneStart = activity.timeZoneStart || tripTimeZone;
      const timeZoneEnd = activity.timeZoneEnd || tripTimeZone;

      // Check if it's an all-day event (no specific time set)
      const startDt = DateTime.fromMillis(activity.timestampStart, {
        zone: timeZoneStart,
      });
      const endDt = DateTime.fromMillis(activity.timestampEnd, {
        zone: timeZoneEnd,
      });

      const isStartAtMidnight =
        startDt.hour === 0 && startDt.minute === 0 && startDt.second === 0;
      const isSameDayInclusiveEnd =
        endDt.hasSame(startDt, 'day') &&
        endDt.hour === 23 &&
        endDt.minute === 59;
      const nextDayStartDt = startDt.plus({ days: 1 });
      const isNextDayExclusiveEnd =
        endDt.hasSame(nextDayStartDt, 'day') &&
        endDt.hour === 0 &&
        endDt.minute === 0 &&
        endDt.second === 0;

      // Consider it all-day if start is at 00:00 and end is at 23:59 on the same day
      // or exactly the next day at 00:00
      const isAllDay =
        isStartAtMidnight && (isSameDayInclusiveEnd || isNextDayExclusiveEnd);

      const dtStart = isAllDay
        ? `DTSTART;VALUE=DATE:${formatIcsDateTime(activity.timestampStart, timeZoneStart, true)}`
        : `DTSTART${getTzidParam(timeZoneStart)}:${formatIcsDateTime(activity.timestampStart, timeZoneStart)}`;

      // For all-day events, the end date is exclusive per ICS spec. Convert a same-day
      // inclusive 23:59 end to the next day, but preserve an already-exclusive next-day 00:00 end.
      const allDayEndTimestamp = isSameDayInclusiveEnd
        ? endDt.plus({ days: 1 }).toMillis()
        : activity.timestampEnd;
      const dtEnd = isAllDay
        ? `DTEND;VALUE=DATE:${formatIcsDateTime(allDayEndTimestamp, timeZoneEnd, true)}`
        : `DTEND${getTzidParam(timeZoneEnd)}:${formatIcsDateTime(activity.timestampEnd, timeZoneEnd)}`;

      // Build location string
      let locationStr = '';
      if (activity.location) {
        locationStr = escapeIcsText(activity.location);
        if (
          activity.locationDestination &&
          activity.locationDestination !== activity.location
        ) {
          locationStr += ` to ${escapeIcsText(activity.locationDestination)}`;
        }
      }

      // Build description
      let descriptionStr = escapeIcsText(activity.description);
      if (activity.locationLat != null && activity.locationLng != null) {
        const geoUrl = `https://www.google.com/maps?q=${activity.locationLat}\\,${activity.locationLng}`;
        descriptionStr += `${descriptionStr ? '\\n\\n' : ''}Location: ${geoUrl}`;
      }

      const eventLines = [
        'BEGIN:VEVENT',
        `UID:${activity.id}@ikuyo`,
        `DTSTAMP:${now}`,
        dtStart,
        dtEnd,
        `SUMMARY:${escapeIcsText(activity.title)}`,
      ];

      if (locationStr) {
        eventLines.push(`LOCATION:${locationStr}`);
      }

      if (descriptionStr) {
        eventLines.push(`DESCRIPTION:${descriptionStr}`);
      }

      // Add geo coordinates if available
      if (activity.locationLat != null && activity.locationLng != null) {
        eventLines.push(`GEO:${activity.locationLat};${activity.locationLng}`);
      }

      eventLines.push('END:VEVENT');

      return eventLines.map(foldLine).join('\r\n');
    });

  if (events.length === 0) {
    return '';
  }

  const calendarName = tripTitle ? `${tripTitle} - Activities` : 'Activities';

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ikuyo//Activities Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    `X-WR-TIMEZONE:${tripTimeZone}`,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  return `${icsContent}\r\n`;
}

/**
 * Triggers download of ICS file
 */
export function downloadIcs(icsContent: string, filename: string): void {
  const blob = new Blob([icsContent], {
    type: 'text/calendar;charset=utf-8;',
  });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
