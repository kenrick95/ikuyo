import { DateTime } from 'luxon';
import type { DayGroups } from '../Activity/eventGrouping';
import type { TripSliceMacroplan, TripSliceTrip } from '../Trip/store/types';

export function getMacroplanIndexes({
  trip,
  macroplans,
}: {
  trip: TripSliceTrip;
  macroplans: TripSliceMacroplan[];
}) {
  const res: Array<{
    macroplan: TripSliceMacroplan;
    day: {
      start: number;
      end: number;
      startColumn: number;
      endColumn: number | undefined;
    };
  }> = [];
  const tripStartDateTime = DateTime.fromMillis(trip.timestampStart).setZone(
    trip.timeZone,
  );
  for (const macroplan of macroplans) {
    const startDateTime = DateTime.fromMillis(macroplan.timestampStart).setZone(
      trip.timeZone,
    );
    /** Trip's first day: Day 1 */
    const startDay =
      startDateTime.startOf('day').diff(tripStartDateTime, 'days').days + 1;
    const endDateTime = DateTime.fromMillis(macroplan.timestampEnd)
      .setZone(trip.timeZone)
      // Because timestampEnd is the day after it ended, subtract 1 minute to make this this represent final day of the macroplan
      .minus({ minute: 1 });
    /** Trip's final day: Day N */
    const endDay =
      endDateTime.startOf('day').diff(tripStartDateTime, 'days').days + 1;

    res.push({
      macroplan: macroplan,
      day: {
        start: startDay,
        end: endDay,
        startColumn: 1,
        endColumn: 1,
      },
    });
  }

  return res;
}

export function generateMacroplanGridTemplateColumns(
  dayGroups: DayGroups,
): string {
  let str = '';

  // 1 day always have 1 columns
  // Generate something like:
  // [d1-c1]     360 / 2 fr
  // [d1-ce1 d2-c1] 360 / 2 fr
  // [d2-ce1 d3-c1] 360 / 2 fr
  // [d3-ce1 d4-c1] 360 / 2 fr
  // [d4-ce1]

  const maxColumns = 1;
  for (let dayIndex = 0; dayIndex < dayGroups.inTrip.length; dayIndex++) {
    const colWidth = `minmax(${String(150 / 1)}px,${String(360 / 1)}fr)`;
    for (let colIndex = 0; colIndex < maxColumns; colIndex++) {
      const lineNames: string[] = [];
      if (colIndex === 0 && dayIndex > 0) {
        lineNames.push(`d${String(dayIndex)}-ce${String(maxColumns)}`);
      }
      if (colIndex > 0) {
        lineNames.push(`d${String(dayIndex + 1)}-ce${String(colIndex)}`);
      }

      lineNames.push(`d${String(dayIndex + 1)}-c${String(colIndex + 1)}`);

      str += ` [${lineNames.join(' ')}] ${colWidth}`;
    }
  }

  str += ` [d${String(dayGroups.inTrip.length)}-ce${String(maxColumns)}]`;

  return str;
}
