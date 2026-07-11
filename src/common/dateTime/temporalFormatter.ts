// Inspired by Luxon token formatter
// Only implement subset of tokens that are used in this project
// https://moment.github.io/luxon/#/formatting
// https://github.com/moment/luxon/blob/b6b9d03709085008287ed7f4ce5067f0f4be53f2/src/impl/tokenParser.js#L432
// Idea: Use Int.DateTimeFormat

function intlOption(token: string): Intl.DateTimeFormatOptions {
  switch (token) {
    case 'yyyy':
      return { year: 'numeric' };
    case 'MM':
    case 'LL':
      return { month: '2-digit' };
    case 'MMM':
    case 'LLL':
      return { month: 'short' };
    case 'MMMM':
    case 'LLLL':
      return { month: 'long' };
    case 'dd':
      return { day: '2-digit' };
    case 'd':
      return { day: 'numeric' };
    case 'HH':
      return { hour: '2-digit', hour12: false };
    case 'H':
      return { hour: 'numeric', hour12: false };
    case 'hh':
      return { hour: '2-digit', hour12: true };
    case 'h':
      return { hour: 'numeric', hour12: true };
    case 'mm':
      return { minute: '2-digit' };
    case 'ss':
      return { second: '2-digit' };
    default:
      throw new Error(`Unsupported token: ${token}`);
  }
}

export function toFormat(
  format: string,
  temporal: Temporal.PlainDate | Temporal.PlainDateTime,
): string {
  for (let i = 0; i < format.length; i++) {
    const char = format.charAt(i);
    
  }


  return '';
}
