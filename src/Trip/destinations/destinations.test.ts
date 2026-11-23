import { describe, expect, it } from 'vitest';
import {
  gridSlot,
  gridTime,
  repeatedGridRanges,
} from '../TripTimetableView/time';
import {
  destinationAt,
  destinationChoices,
  destinationError,
  type TripDestination,
} from './destinations';
import { itemZonedTime, newActivityTimes } from './newItemTimes';

const taipei: TripDestination = {
  id: 'taipei',
  name: 'Taipei',
  region: 'TW',
  timeZone: 'Asia/Taipei',
  currency: 'TWD',
  startsOn: '2026-05-06',
  startsAtTime: '15:40',
  startOffset: null,
};
const trip = {
  region: 'JP',
  timeZone: 'Asia/Tokyo',
  currency: 'JPY',
  timestampStart: Date.parse('2026-05-03T00:00:00+09:00'),
  destinations: [taipei],
};

describe('destination defaults', () => {
  it('changes currency and time zone at the arrival instant', () => {
    const arrival = Date.parse('2026-05-06T15:40:00+08:00');
    expect(destinationAt(trip, arrival - 1).currency).toBe('JPY');
    expect(destinationAt(trip, arrival).currency).toBe('TWD');
  });

  it('resolves an out-of-order expense and gives a recognized place priority', () => {
    expect(
      destinationChoices(
        trip,
        Temporal.PlainDateTime.from('2026-05-05T13:00'),
      )[0]?.currency,
    ).toBe('JPY');
    expect(
      destinationChoices(
        trip,
        Temporal.PlainDateTime.from('2026-05-05T13:00'),
        'Taipei 101, Taiwan',
      )[0]?.currency,
    ).toBe('TWD');
  });

  it('offers a destination choice when local times overlap at the handoff', () => {
    expect(
      destinationChoices(
        trip,
        Temporal.PlainDateTime.from('2026-05-06T16:00'),
      ).map((item) => item.currency),
    ).toEqual(['JPY', 'TWD']);
  });

  it('preserves the instant of a timetable slot in another display zone', () => {
    const instant = Date.parse('2026-05-05T23:30:00+08:00');
    const [start, , zone] = newActivityTimes(
      trip,
      { instant, dayOfTrip: 1, timeStart: '2330' },
      undefined,
      1,
    );
    expect(zone).toBe('Asia/Tokyo');
    expect(start.toString()).toBe('2026-05-06T00:30:00');
    expect(itemZonedTime(start, zone, instant)?.epochMilliseconds).toBe(
      instant,
    );
  });

  it('requires a selected offset on a repeated destination start', () => {
    const stop = {
      ...taipei,
      timeZone: 'America/New_York',
      startsOn: '2026-11-01',
      startsAtTime: '01:30',
    };
    expect(destinationError([stop])).toContain('ambiguous');
    expect(
      destinationError([{ ...stop, startOffset: '-05:00' }]),
    ).toBeUndefined();
  });
});

describe('timetable clock changes', () => {
  it('provides distinct target instants in a repeated hour', () => {
    const date =
      Temporal.PlainDate.from('2026-11-01').toZonedDateTime('America/New_York');
    const early = gridSlot(date, '0130');
    const late = gridSlot(date, '0130-repeat');
    if (early === undefined || late === undefined)
      throw new Error('Both repeated-hour slots must be available');
    expect(late - early).toBe(3_600_000);
    expect(
      gridTime(
        Temporal.Instant.fromEpochMilliseconds(late).toZonedDateTimeISO(
          date.timeZoneId,
        ),
      ),
    ).toBe('0130-repeat');
    expect(repeatedGridRanges([date])).toEqual([
      { start: 60, end: 120, label: '-05:00' },
    ]);
  });
  it('omits a skipped slot', () => {
    const date =
      Temporal.PlainDate.from('2026-03-08').toZonedDateTime('America/New_York');
    expect(gridSlot(date, '0230')).toBeUndefined();
  });
});
