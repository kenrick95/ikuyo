import { DateTime } from 'luxon';

export function luxonToTemporalDateTime(
  luxonDateTime: DateTime,
): Temporal.PlainDateTime {
  return Temporal.PlainDateTime.from({
    year: luxonDateTime.year,
    month: luxonDateTime.month,
    day: luxonDateTime.day,
    hour: luxonDateTime.hour,
    minute: luxonDateTime.minute,
    second: luxonDateTime.second,
    millisecond: luxonDateTime.millisecond,
  });
}

export function luxonToTemporalDate(
  luxonDateTime: DateTime,
): Temporal.PlainDate {
  return Temporal.PlainDate.from({
    year: luxonDateTime.year,
    month: luxonDateTime.month,
    day: luxonDateTime.day,
  });
}

export function temporalToLuxonDateTime(
  temporalDateTime: Temporal.PlainDateTime,
  timeZone?: string,
): DateTime {
  return DateTime.fromObject(
    {
      year: temporalDateTime.year,
      month: temporalDateTime.month,
      day: temporalDateTime.day,
      hour: temporalDateTime.hour,
      minute: temporalDateTime.minute,
      second: temporalDateTime.second,
      millisecond: temporalDateTime.millisecond,
    },
    { zone: timeZone || 'local' },
  );
}
export function temporalToLuxonDate(
  temporalDate: Temporal.PlainDate,
  timeZone?: string,
): DateTime {
  return DateTime.fromObject(
    {
      year: temporalDate.year,
      month: temporalDate.month,
      day: temporalDate.day,
    },
    { zone: timeZone || 'local' },
  );
}
