/**
 * Temporal polyfill for date handling
 * Based on cally's implementation
 */

type Duration = { months: number } | { years: number } | { days: number };
type CompareResult = -1 | 0 | 1;

const ISO_DATE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[0-1])$/;

const padZero = (value: number, length: number) =>
  value.toString().padStart(length, '0');

export type DaysOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function getToday() {
  const d = new Date();
  return new PlainDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function startOfWeek(
  date: PlainDate,
  firstDayOfWeek: DaysOfWeek = 0,
): PlainDate {
  const d = toDate(date);
  const day = d.getUTCDay();
  const diff = (day < firstDayOfWeek ? 7 : 0) + day - firstDayOfWeek;

  d.setUTCDate(d.getUTCDate() - diff);
  return PlainDate.from(d);
}

export function endOfWeek(
  date: PlainDate,
  firstDayOfWeek: DaysOfWeek = 0,
): PlainDate {
  return startOfWeek(date, firstDayOfWeek).add({ days: 6 });
}

export function endOfMonth(date: { year: number; month: number }): PlainDate {
  return PlainDate.from(new Date(Date.UTC(date.year, date.month, 0)));
}

/**
 * Ensures date is within range, returns min or max if out of bounds
 */
export function clamp(
  date: PlainDate,
  min?: PlainDate,
  max?: PlainDate,
): PlainDate {
  if (min && PlainDate.compare(date, min) < 0) return min;
  if (max && PlainDate.compare(date, max) > 0) return max;
  return date;
}

const oneDay = { days: 1 };

/**
 * given a date, return an array of dates from a calendar perspective
 */
export function getViewOfMonth(
  yearMonth: PlainYearMonth,
  firstDayOfWeek: DaysOfWeek = 0,
): PlainDate[][] {
  let start = startOfWeek(yearMonth.toPlainDate(), firstDayOfWeek);
  const end = endOfWeek(endOfMonth(yearMonth), firstDayOfWeek);

  const weeks: PlainDate[][] = [];

  // get all days in range
  while (PlainDate.compare(start, end) < 0) {
    const week = [];

    // chunk into weeks
    for (let i = 0; i < 7; i++) {
      week.push(start);
      start = start.add(oneDay);
    }

    weeks.push(week);
  }

  return weeks;
}

interface DateLike {
  year: number;
  month: number;
  day?: number;
}

export function toDate(date: DateLike): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day ?? 1));
}

export class PlainDate {
  constructor(
    public readonly year: number,
    public readonly month: number,
    public readonly day: number,
  ) {}

  // this is an incomplete implementation that only handles arithmetic on a single unit at a time.
  // i didn't want to get into more complex arithmetic since it get tricky fast
  // this is enough to serve my needs and will still be a drop-in replacement when actual Temporal API lands
  add(duration: Duration): PlainDate {
    const date = toDate(this);

    if ('days' in duration) {
      date.setUTCDate(this.day + duration.days);
      return PlainDate.from(date);
    }

    // let min: PlainDate;
    let { year, month } = this;

    // ensures date arithmetic is constrained
    // e.g. add 1 month to 31st March -> 30th April
    if ('months' in duration) {
      month = this.month + duration.months;
      date.setUTCMonth(month - 1);
    }
    // ensures date arithmetic is constrained
    // e.g. add 1 year to 29th Feb -> 28th Feb
    else {
      year = this.year + duration.years;
      date.setUTCFullYear(year);
    }

    const min = PlainDate.from(toDate({ year, month, day: 1 }));
    return clamp(PlainDate.from(date), min, endOfMonth(min));
  }

  toString(): string {
    return `${padZero(this.year, 4)}-${padZero(this.month, 2)}-${padZero(this.day, 2)}`;
  }

  toPlainYearMonth() {
    return new PlainYearMonth(this.year, this.month);
  }

  equals(date: PlainDate): boolean {
    return PlainDate.compare(this, date) === 0;
  }

  static compare(a: PlainDate, b: PlainDate): CompareResult {
    if (a.year < b.year) return -1;
    if (a.year > b.year) return 1;
    if (a.month < b.month) return -1;
    if (a.month > b.month) return 1;
    if (a.day < b.day) return -1;
    if (a.day > b.day) return 1;
    return 0;
  }

  static from(value: string | Date): PlainDate {
    if (typeof value === 'string') {
      const match = value.match(ISO_DATE);

      if (!match) {
        throw new TypeError(value);
      }

      const [, year, month, day] = match;
      if (!year || !month || !day) {
        throw new TypeError(value);
      }
      return new PlainDate(
        parseInt(year, 10),
        parseInt(month, 10),
        parseInt(day, 10),
      );
    }

    return new PlainDate(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate(),
    );
  }
}

type YearMonthDuration = { months?: number; years?: number };

export class PlainYearMonth {
  constructor(
    public readonly year: number,
    public readonly month: number,
  ) {}

  add(duration: YearMonthDuration): PlainYearMonth {
    let { year, month } = this;

    if (duration.months) {
      month += duration.months;
      while (month > 12) {
        month -= 12;
        year += 1;
      }
      while (month < 1) {
        month += 12;
        year -= 1;
      }
    }

    if (duration.years) {
      year += duration.years;
    }

    return new PlainYearMonth(year, month);
  }

  equals(other: PlainDate | PlainYearMonth): boolean {
    if (other instanceof PlainDate) {
      return this.year === other.year && this.month === other.month;
    }
    return this.year === other.year && this.month === other.month;
  }

  toPlainDate(day = 1): PlainDate {
    return new PlainDate(this.year, this.month, day);
  }

  toString(): string {
    return `${padZero(this.year, 4)}-${padZero(this.month, 2)}`;
  }

  static from(value: string): PlainYearMonth {
    const [year, month] = value.split('-');
    if (!year || !month) {
      throw new TypeError(value);
    }
    return new PlainYearMonth(parseInt(year, 10), parseInt(month, 10));
  }
}
