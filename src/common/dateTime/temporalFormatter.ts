// Inspired by Luxon token formatter
// Only implement subset of tokens that are used in this project
// https://moment.github.io/luxon/#/formatting
// https://github.com/moment/luxon/blob/b6b9d03709085008287ed7f4ce5067f0f4be53f2/src/impl/tokenParser.js#L432
// Idea: Use Int.DateTimeFormat
// TODO: I don't like this... we should do something like toFormat([TOKEN.YEAR_FULL, ' ', TOKEN.MONTH_SHORT, ' ', TOKEN.DAY_OF_MONTH_2_DIGIT], temporal) instead of parsing a string format. This would be more type-safe and avoid parsing errors. But for now, this is good enough.
type SupportedTemporal =
  | Temporal.PlainDate
  | Temporal.PlainDateTime
  | Temporal.ZonedDateTime;

const TOKENS = [
  'yyyy',
  'MMMM',
  'LLLL',
  'cccc',
  'MMM',
  'LLL',
  'ccc',
  'MM',
  'LL',
  'dd',
  'HH',
  'hh',
  'mm',
  'ss',
  'ZZ',
  'd',
  'H',
  'h',
  'm',
  's',
  'a',
] as const;

type Token = (typeof TOKENS)[number];

function isPlainDateTime(
  temporal: SupportedTemporal,
): temporal is Temporal.PlainDateTime {
  return 'hour' in temporal;
}

/**
 * Converts the Temporal value to a Date without applying the local time zone.
 *
 * The Date is only used as an Intl.DateTimeFormat input. Formatting is always
 * done in UTC, so the Temporal wall-clock fields remain unchanged.
 */
function toSurrogateDate(temporal: SupportedTemporal): Date {
  const date = new Date(0);

  date.setUTCFullYear(temporal.year, temporal.month - 1, temporal.day);

  if (isPlainDateTime(temporal)) {
    date.setUTCHours(
      temporal.hour,
      temporal.minute,
      temporal.second,
      temporal.millisecond,
    );
  } else {
    date.setUTCHours(0, 0, 0, 0);
  }

  return date;
}

function formatNumber(
  value: number,
  minimumIntegerDigits: number,
  locales?: Intl.LocalesArgument,
): string {
  return new Intl.NumberFormat(locales, {
    useGrouping: false,
    minimumIntegerDigits,
  }).format(value);
}

function formatMonthName(
  temporal: SupportedTemporal,
  width: 'short' | 'long',
  locales?: Intl.LocalesArgument,
): string {
  const formatter = new Intl.DateTimeFormat(locales, {
    month: width,
    timeZone: 'UTC',
  });

  const monthPart = formatter
    .formatToParts(toSurrogateDate(temporal))
    .find((part) => part.type === 'month');

  if (!monthPart) {
    throw new Error('Intl.DateTimeFormat did not produce a month part');
  }

  return monthPart.value;
}

function formatWeekdayName(
  temporal: SupportedTemporal,
  width: 'short' | 'long',
  locales?: Intl.LocalesArgument,
): string {
  const formatter = new Intl.DateTimeFormat(locales, {
    weekday: width,
    timeZone: 'UTC',
  });
  const weekdayPart = formatter
    .formatToParts(toSurrogateDate(temporal))
    .find((part) => part.type === 'weekday');

  if (!weekdayPart) {
    throw new Error('Intl.DateTimeFormat did not produce a weekday part');
  }
  return weekdayPart.value;
}

function formatToken(
  token: Token,
  temporal: SupportedTemporal,
  locales?: Intl.LocalesArgument,
): string {
  switch (token) {
    case 'yyyy':
      return formatNumber(temporal.year, 4, locales);

    case 'MM':
    case 'LL':
      return formatNumber(temporal.month, 2, locales);

    case 'MMM':
    case 'LLL':
      return formatMonthName(temporal, 'short', locales);

    case 'MMMM':
    case 'LLLL':
      return formatMonthName(temporal, 'long', locales);

    case 'cccc':
      return formatWeekdayName(temporal, 'long', locales);
    case 'ccc':
      return formatWeekdayName(temporal, 'short', locales);

    case 'dd':
      return formatNumber(temporal.day, 2, locales);

    case 'ZZ':
      if (temporal instanceof Temporal.ZonedDateTime) {
        return temporal.timeZoneId;
      }
      throw new RangeError(`Token "${token}" requires Temporal.ZonedDateTime`);

    case 'd':
      return formatNumber(temporal.day, 1, locales);
  }

  if (!isPlainDateTime(temporal)) {
    throw new RangeError(`Token "${token}" requires Temporal.PlainDateTime`);
  }

  switch (token) {
    case 'HH':
      return formatNumber(temporal.hour, 2, locales);

    case 'H':
      return formatNumber(temporal.hour, 1, locales);

    case 'hh':
      return formatNumber(temporal.hour % 12 || 12, 2, locales);

    case 'h':
      return formatNumber(temporal.hour % 12 || 12, 1, locales);

    case 'mm':
      return formatNumber(temporal.minute, 2, locales);

    case 'm':
      return formatNumber(temporal.minute, 1, locales);

    case 'ss':
      return formatNumber(temporal.second, 2, locales);

    case 's':
      return formatNumber(temporal.second, 1, locales);

    case 'a':
      return temporal.hour < 12 ? 'AM' : 'PM';
  }
}

function readQuotedLiteral(
  format: string,
  start: number,
): { value: string; nextIndex: number } {
  let value = '';
  let index = start + 1;

  while (index < format.length) {
    if (format[index] !== "'") {
      value += format[index];
      index++;
      continue;
    }

    // Two consecutive apostrophes inside a quoted section represent one
    // literal apostrophe.
    if (format[index + 1] === "'") {
      value += "'";
      index += 2;
      continue;
    }

    return {
      value,
      nextIndex: index + 1,
    };
  }

  throw new RangeError(`Unterminated quoted literal at index ${start}`);
}

export function toFormat(
  format: string,
  temporal: SupportedTemporal,
  locales?: Intl.LocalesArgument,
): string {
  let result = '';
  let index = 0;

  while (index < format.length) {
    if (format[index] === "'") {
      // Outside a quoted section, two apostrophes also produce one apostrophe.
      if (format[index + 1] === "'") {
        result += "'";
        index += 2;
        continue;
      }

      const literal = readQuotedLiteral(format, index);
      result += literal.value;
      index = literal.nextIndex;
      continue;
    }

    const token = TOKENS.find((candidate) =>
      format.startsWith(candidate, index),
    );

    if (token) {
      result += formatToken(token, temporal, locales);
      index += token.length;
      continue;
    }

    result += format[index];
    index++;
  }

  return result;
}
