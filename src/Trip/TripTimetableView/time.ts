export function pad2(num: number): string {
  if (num >= 10) {
    return String(num);
  }
  return `0${String(num)}`;
}

export function gridTime(value: Temporal.ZonedDateTime) {
  const time = `${pad2(value.hour)}${pad2(value.minute)}`;
  const earlier = value
    .toPlainDateTime()
    .toZonedDateTime(value.timeZoneId, { disambiguation: 'earlier' });
  return earlier.offset === value.offset ? time : `${time}-repeat`;
}

export function gridSlot(day: Temporal.ZonedDateTime, time: string) {
  const hour = Number(time.slice(0, 2));
  const minute = Number(time.slice(2, 4));
  const repeated = time.endsWith('-repeat');
  if (day.hoursInDay === 24) {
    return repeated
      ? undefined
      : day.epochMilliseconds + (hour * 60 + minute) * 60_000;
  }
  const value = day.toPlainDate().toPlainDateTime({ hour, minute });
  const result = value.toZonedDateTime(day.timeZoneId, {
    disambiguation: repeated ? 'later' : 'earlier',
  });
  return result.toPlainDateTime().equals(value) &&
    (!repeated || gridTime(result) === time)
    ? result.epochMilliseconds
    : undefined;
}

export function repeatedGridRanges(days: Temporal.ZonedDateTime[]) {
  const ranges = new Map<
    number,
    { start: number; end: number; label: string }
  >();
  for (const day of days) {
    const transition = day
      .subtract({ nanoseconds: 1 })
      .getTimeZoneTransition('next');
    if (!transition?.toPlainDate().equals(day.toPlainDate())) continue;
    const before = transition.subtract({ nanoseconds: 1 });
    const length =
      (before.offsetNanoseconds - transition.offsetNanoseconds) /
      60_000_000_000;
    if (length <= 0 || !Number.isInteger(length)) continue;
    const start = transition.hour * 60 + transition.minute;
    ranges.set(start + length, {
      start,
      end: start + length,
      label: transition.offset,
    });
  }
  return [...ranges.values()];
}

export function gridTemplateWithRepeats(
  ranges: ReturnType<typeof repeatedGridRanges>,
) {
  if (!ranges.length) return undefined;
  const names: string[] = [];
  const name = (minute: number) =>
    `${pad2(Math.floor(minute / 60))}${pad2(minute % 60)}`;
  const byEnd = new Map(ranges.map((range) => [range.end, range]));
  for (let minute = 0; minute <= 1440; minute++) {
    const range = byEnd.get(minute);
    if (range) {
      for (let repeat = range.start; repeat < range.end; repeat++)
        names.push(`${name(repeat)}-repeat`);
    }
    if (minute < 1440) names.push(name(minute));
  }
  let rows =
    '[header] 50px [destinations] min-content [macroplan] min-content [accommodation] min-content';
  for (const [index, time] of names.entries()) {
    const previous = names[index - 1];
    rows += ` [${previous ? `te${previous} ` : ''}t${time}] var(--row-minute-${Number(time.slice(0, 2)) <= 5 ? 'narrow-' : ''}height)`;
  }
  return `${rows} [te${names.at(-1)}]`;
}
