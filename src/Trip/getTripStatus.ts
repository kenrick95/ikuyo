import { DateTime } from 'luxon';

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
    formattedText = `${significantParts.slice(0, -1).join(', ')} and ${significantParts[significantParts.length - 1]}`;
  }

  return isFuture ? formattedText : `${formattedText} ago`;
}

export function getTripStatus(tripStart?: DateTime, tripEnd?: DateTime) {
  if (!tripStart || !tripEnd) return null;
  const now = DateTime.now();

  if (now < tripStart) {
    // Trip is in the future - show detailed countdown
    const diff = tripStart.diff(now, [
      'years',
      'months',
      'weeks',
      'days',
      'hours',
      'minutes',
    ]);
    const years = Math.floor(diff.years);
    const months = Math.floor(diff.months % 12);
    const weeks = Math.floor(diff.weeks % 4.35); // Approximate weeks in a month
    const days = Math.floor(diff.days % 7);
    const hours = Math.floor(diff.hours);
    const minutes = Math.floor(diff.minutes);
    const totalDays = Math.floor(diff.days);

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
      status: 'upcoming',
      text:
        formattedText === 'Starting soon'
          ? formattedText
          : `In ${formattedText}`,
      color: 'blue' as const,
    };
  } else if (now >= tripStart && now < tripEnd) {
    // Trip is currently happening
    return {
      status: 'current',
      text: 'Trip in progress',
      color: 'green' as const,
    };
  } else {
    // Trip is in the past - show detailed time elapsed
    const diff = now.diff(tripEnd, [
      'years',
      'months',
      'weeks',
      'days',
      'hours',
      'minutes',
    ]);
    const years = Math.floor(diff.years);
    const months = Math.floor(diff.months % 12);
    const weeks = Math.floor(diff.weeks % 4.35); // Approximate weeks in a month
    const days = Math.floor(diff.days % 7);
    const hours = Math.floor(diff.hours);
    const minutes = Math.floor(diff.minutes);
    const totalDays = Math.floor(diff.days);

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
      status: 'past',
      text: formattedText,
      color: 'gray' as const,
    };
  }
}
