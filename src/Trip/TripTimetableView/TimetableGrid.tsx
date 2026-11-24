import type { RefObject } from 'react';
import React, { memo } from 'react';
import { canModifyTripContent } from '../permissions';
import { useCurrentTrip } from '../store/hooks';
import { TimetableDragTarget } from './TimetableDragTarget';
import { gridSlot, pad2 } from './time';
import { useTimetableSlotActions } from './useTimetableSlotActions';

interface TimetableGridProps {
  days: number;
  dayStarts?: Temporal.ZonedDateTime[];
  scrollContainerRef: RefObject<HTMLElement | null>;
}

function TimetableGridInner({
  days,
  dayStarts,
  scrollContainerRef,
}: TimetableGridProps) {
  // Create an array of hours (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Create an array of days (1 to days)
  const daysArray = Array.from({ length: days }, (_, i) => i + 1);

  // Use fewer intervals for better performance - every 30 mins
  const timeIntervals = [0, 30];

  const { trip } = useCurrentTrip();
  const userCanModifyTrip = canModifyTripContent(trip);
  const openSlot = useTimetableSlotActions(trip);

  return (
    <>
      {daysArray.map((day) => (
        <React.Fragment key={`day-${day}`}>
          {hours.map((hour) => (
            <React.Fragment key={`day-${day}-hour-${hour}`}>
              {timeIntervals.flatMap((minute) => {
                const baseTime = `${pad2(hour)}${pad2(minute)}`;
                const columnStr = `d${day}-c1`; // Assuming single column per day

                const dayStart = dayStarts?.[day - 1];
                const times = dayStart
                  ? [baseTime, `${baseTime}-repeat`]
                  : [baseTime];
                return times.flatMap((timeStr) => {
                  const instant = dayStart
                    ? gridSlot(dayStart, timeStr)
                    : undefined;
                  if (dayStart && instant === undefined) return [];
                  const suffix = timeStr.endsWith('-repeat') ? '-repeat' : '';
                  return (
                    <TimetableDragTarget
                      key={`${day}-${timeStr}`}
                      day={day}
                      timeStr={timeStr}
                      instant={instant}
                      date={dayStart?.toPlainDate().toString()}
                      columnStr={columnStr}
                      gridStyle={{
                        gridRowStart: `t${timeStr}`,
                        gridRowEnd:
                          minute === 30
                            ? `te${pad2(hour)}59${suffix}`
                            : `te${pad2(hour)}${dayStart ? 29 : 30}${suffix}`,
                        gridColumnStart: `d${day}`,
                        gridColumnEnd: `de${day}`,
                      }}
                      scrollContainerRef={scrollContainerRef}
                      tripTitle={trip?.title}
                      userCanModifyTrip={userCanModifyTrip}
                      onSelect={openSlot}
                    />
                  );
                });
              })}
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
    </>
  );
}
export const TimetableGrid = memo(
  TimetableGridInner,
  (prevProps, nextProps) => {
    return (
      prevProps.days === nextProps.days &&
      prevProps.dayStarts === nextProps.dayStarts &&
      prevProps.scrollContainerRef === nextProps.scrollContainerRef
    );
  },
);
