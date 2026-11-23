import type { RefObject } from 'react';
import React, { type MouseEvent, memo, useCallback } from 'react';
import { AccommodationNewDialog } from '../../Accommodation/AccommodationNewDialog';
import { ActivityNewDialog } from '../../Activity/ActivityNewDialog';
import { FlightNewDialog } from '../../Activity/FlightNewDialog';
import { TrainNewDialog } from '../../Activity/TrainNewDialog';
import { useBoundStore } from '../../data/store';
import { MacroplanNewDialog } from '../../Macroplan/MacroplanNewDialog';
import { canModifyTripContent } from '../permissions';
import { useCurrentTrip } from '../store/hooks';
import { TimetableDragTarget } from './TimetableDragTarget';
import { gridSlot, pad2 } from './time';

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
  const pushDialog = useBoundStore((state) => state.pushDialog);

  const openActivityNewDialog = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!trip) return;
      const el = e.currentTarget;
      const dayOfTrip = el.dataset.day;
      const timeStart = el.dataset.timeStart;
      const instant = el.dataset.instant;

      // Pass the data attributes to prefill the ActivityNewDialog
      const prefillData =
        dayOfTrip && timeStart
          ? {
              dayOfTrip: parseInt(dayOfTrip, 10),
              timeStart,
              instant: instant === undefined ? undefined : Number(instant),
            }
          : undefined;

      pushDialog(ActivityNewDialog, { trip, prefillData });
    },
    [pushDialog, trip],
  );
  const openFlightNewDialog = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!trip) return;
      const el = e.currentTarget;
      const dayOfTrip = el.dataset.day;
      const timeStart = el.dataset.timeStart;
      const instant = el.dataset.instant;

      const prefillData =
        dayOfTrip && timeStart
          ? {
              dayOfTrip: parseInt(dayOfTrip, 10),
              timeStart,
              instant: instant === undefined ? undefined : Number(instant),
            }
          : undefined;

      pushDialog(FlightNewDialog, { trip, prefillData });
    },
    [pushDialog, trip],
  );
  const openTrainNewDialog = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!trip) return;
      const el = e.currentTarget;
      const dayOfTrip = el.dataset.day;
      const timeStart = el.dataset.timeStart;
      const instant = el.dataset.instant;

      const prefillData =
        dayOfTrip && timeStart
          ? {
              dayOfTrip: parseInt(dayOfTrip, 10),
              timeStart,
              instant: instant === undefined ? undefined : Number(instant),
            }
          : undefined;

      pushDialog(TrainNewDialog, { trip, prefillData });
    },
    [pushDialog, trip],
  );
  const openAccommodationNewDialog = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!trip) return;
      const el = e.currentTarget;
      const dayOfTrip = el.dataset.day;

      const prefillData = dayOfTrip
        ? {
            dayOfTrip: parseInt(dayOfTrip, 10),
            date: el.dataset.date,
          }
        : undefined;

      pushDialog(AccommodationNewDialog, { trip, prefillData });
    },
    [pushDialog, trip],
  );
  const openMacroplanNewDialog = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!trip) return;
      const el = e.currentTarget;
      const dayOfTrip = el.dataset.day;

      const prefillData = dayOfTrip
        ? {
            dayOfTrip: parseInt(dayOfTrip, 10),
            date: el.dataset.date,
          }
        : undefined;

      pushDialog(MacroplanNewDialog, { trip, prefillData });
    },
    [pushDialog, trip],
  );

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
                      onNewActivity={openActivityNewDialog}
                      onNewFlight={openFlightNewDialog}
                      onNewTrain={openTrainNewDialog}
                      onNewAccommodation={openAccommodationNewDialog}
                      onNewMacroplan={openMacroplanNewDialog}
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
