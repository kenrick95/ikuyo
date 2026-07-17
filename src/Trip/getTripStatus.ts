function buildTimeParts(
  years: number,
  months: number,
  weeks: number,
  days: number,
  hours: number,
  minutes: number,
  totalDays: number,
): string[] {
  const parts: string[] = [];

  // Add years if present
  if (years > 0) {
    parts.push(`${years} year${years !== 1 ? 's' : ''}`);
  }

  // Add months if present and we have space
  if (months > 0 && parts.length < 3) {
    parts.push(`${months} month${months !== 1 ? 's' : ''}`);
  }

  // Add weeks if present and we have space (allow with months now)
  if (weeks > 0 && years === 0 && parts.length < 3) {
    parts.push(`${weeks} week${weeks !== 1 ? 's' : ''}`);
  }

  // Add days if relevant and we have space
  if (days > 0 && years === 0 && months === 0 && parts.length < 3) {
    if (weeks > 0) {
      parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    } else {
      // If no weeks, show total days
      if (totalDays > 0) {
        parts.push(`${totalDays} day${totalDays !== 1 ? 's' : ''}`);
      }
    }
  }

  // Add hours if reasonable and we have space (allow with weeks/days)
  if (
    hours > 0 &&
    years === 0 &&
    months === 0 &&
    totalDays < 30 &&
    parts.length < 3
  ) {
    parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  }

  // Add minutes if we're within a day and we have space
  if (
    minutes > 0 &&
    years === 0 &&
    months === 0 &&
    weeks === 0 &&
    totalDays === 0 &&
    parts.length < 3
  ) {
    parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  }

  return parts;
}

function formatTimeParts(
  parts: string[],
  fallbackMinutes: number,
  isFuture: boolean,
): string {
  // Handle edge cases
  if (parts.length === 0) {
    if (Math.floor(fallbackMinutes) > 0) {
      const minuteText = `${Math.floor(fallbackMinutes)} minute${Math.floor(fallbackMinutes) !== 1 ? 's' : ''}`;
      return isFuture ? minuteText : `${minuteText} ago`;
    } else {
      return isFuture ? 'Starting soon' : 'Just ended';
    }
  }

  // Join parts with commas, limit to 3 most significant units
  const significantParts = parts.slice(0, 3);
  let formattedText = '';

  if (significantParts.length === 1) {
    formattedText = significantParts[0];
  } else if (significantParts.length === 2) {
    formattedText = significantParts.join(', ');
  } else {
    formattedText = `${significantParts.slice(0, -1).join(', ')}, and ${significantParts[significantParts.length - 1]}`;
  }

  return isFuture ? formattedText : `${formattedText} ago`;
}

/**
 *
 * @param tripStart DateTime of day of the trip start
 * @param tripEnd DateTime of day _after_ of trip end. This means the final full day of trip is one day before `timestampEnd`
 * @returns
 */
export function getTripStatus(
  tripStart?: Temporal.ZonedDateTime,
  tripEnd?: Temporal.ZonedDateTime,
) {
  if (!tripStart || !tripEnd) return null;
  const nowInTripTimeZone = Temporal.Now.instant().toZonedDateTimeISO(
    tripStart.timeZoneId || tripEnd.timeZoneId,
  );

  if (nowInTripTimeZone.epochMilliseconds < tripStart.epochMilliseconds) {
    // Trip is in the future - show detailed countdown

    // Must use "Calendar duration" operations to get years and months
    const calendarDiff = nowInTripTimeZone.until(tripStart, {
      largestUnit: 'years',
      smallestUnit: 'months',
    });
    const cursor = nowInTripTimeZone.add(calendarDiff);
    const diff = cursor.until(tripStart, {
      largestUnit: 'weeks',
      smallestUnit: 'minutes',
    });
    const years = calendarDiff.years;
    const months = calendarDiff.months;
    const weeks = diff.weeks;
    const days = diff.days;
    const hours = diff.hours;
    const minutes = diff.minutes;
    const totalDays = nowInTripTimeZone.until(tripStart, {
      largestUnit: 'days',
    }).days;

    const parts = buildTimeParts(
      years,
      months,
      weeks,
      days,
      hours,
      minutes,
      totalDays,
    );
    const formattedText = formatTimeParts(parts, minutes, true);

    return {
      status: 'upcoming' as const,
      text:
        formattedText === 'Starting soon'
          ? formattedText
          : `In ${formattedText}`,
      color: 'blue' as const,
    };
  } else if (
    nowInTripTimeZone.epochMilliseconds >= tripStart.epochMilliseconds &&
    nowInTripTimeZone.epochMilliseconds < tripEnd.epochMilliseconds
  ) {
    // Trip is currently happening
    const totalDays = tripStart.until(tripEnd, { largestUnit: 'days' }).days;
    const currentDay =
      tripStart.until(nowInTripTimeZone, { largestUnit: 'days' }).days + 1; // Add 1 to make it 1-indexed
    return {
      status: 'current' as const,
      text: `Trip in progress: Day ${currentDay} of ${totalDays}`,
      color: 'green' as const,
    };
  } else {
    // Trip is in the past - show detailed time elapsed
    // Must use "Calendar duration" operations to get years and months
    const calendarDiff = nowInTripTimeZone.since(tripEnd, {
      largestUnit: 'years',
      smallestUnit: 'months',
    });
    const cursor = nowInTripTimeZone.subtract(calendarDiff);
    const diff = cursor.since(tripEnd, {
      largestUnit: 'weeks',
      smallestUnit: 'minutes',
    });
    const years = calendarDiff.years;
    const months = calendarDiff.months;
    const weeks = diff.weeks;
    const days = diff.days;
    const hours = diff.hours;
    const minutes = diff.minutes;
    const totalDays = nowInTripTimeZone.since(tripEnd, {
      largestUnit: 'days',
    }).days;

    const parts = buildTimeParts(
      years,
      months,
      weeks,
      days,
      hours,
      minutes,
      totalDays,
    );
    const formattedText = formatTimeParts(parts, minutes, false);

    return {
      status: 'past' as const,
      text: formattedText,
      color: 'gray' as const,
    };
  }
}
