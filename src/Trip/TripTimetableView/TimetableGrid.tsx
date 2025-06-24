import { ContextMenu } from '@radix-ui/themes';
import React, { type MouseEvent, memo, useCallback, useMemo } from 'react';
import { AccommodationNewDialog } from '../../Accommodation/AccommodationNewDialog';
import { ActivityNewDialog } from '../../Activity/ActivityNewDialog';
import { useBoundStore } from '../../data/store';
import { MacroplanNewDialog } from '../../Macroplan/MacroplanNewDialog';
import { TripUserRole } from '../../User/TripUserRole';
import { useCurrentTrip } from '../store/hooks';
import { TimetableCell } from './TimetableCell';
import { pad2 } from './time';

interface TimetableGridProps {
  days: number;
}

function TimetableGridInner({ days }: TimetableGridProps) {
  // Create an array of hours (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Create an array of days (1 to days)
  const daysArray = Array.from({ length: days }, (_, i) => i + 1);

  // Use fewer intervals for better performance - every 30 mins
  const timeIntervals = [0, 30];

  const { trip } = useCurrentTrip();
  const userCanModifyTrip = useMemo(() => {
    return (
      trip?.currentUserRole === TripUserRole.Owner ||
      trip?.currentUserRole === TripUserRole.Editor
    );
  }, [trip?.currentUserRole]);
  const pushDialog = useBoundStore((state) => state.pushDialog);

  const openActivityNewDialog = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!trip) return;
      const el = e.currentTarget;
      const dayOfTrip = el.dataset.day;
      const timeStart = el.dataset.timeStart;

      // Pass the data attributes to prefill the ActivityNewDialog
      const prefillData =
        dayOfTrip && timeStart
          ? {
              dayOfTrip: parseInt(dayOfTrip, 10),
              timeStart: timeStart,
            }
          : undefined;

      pushDialog(ActivityNewDialog, { trip, prefillData });
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
              {timeIntervals.map((minute) => {
                const timeStr = `${pad2(hour)}${pad2(minute)}`;
                const columnStr = `d${day}-c1`; // Assuming single column per day

                return (
                  <ContextMenu.Root key={`${day}-${timeStr}`}>
                    <ContextMenu.Trigger>
                      <div
                        style={{
                          gridRowStart: `t${timeStr}`,
                          gridRowEnd:
                            minute === 30
                              ? `te${pad2(hour)}59`
                              : `te${pad2(hour)}30`,
                          gridColumnStart: `d${day}`,
                          gridColumnEnd: `de${day}`,
                        }}
                      >
                        <TimetableCell row={`t${timeStr}`} column={columnStr} />
                      </div>
                    </ContextMenu.Trigger>
                    <ContextMenu.Content>
                      <ContextMenu.Label>{trip?.title}</ContextMenu.Label>
                      <ContextMenu.Item
                        onClick={
                          userCanModifyTrip ? openActivityNewDialog : undefined
                        }
                        disabled={!userCanModifyTrip}
                        data-time-start={timeStr}
                        data-day={day}
                      >
                        New activity
                      </ContextMenu.Item>

                      <ContextMenu.Item
                        onClick={
                          userCanModifyTrip
                            ? openAccommodationNewDialog
                            : undefined
                        }
                        disabled={!userCanModifyTrip}
                        data-day={day}
                      >
                        New acommodation
                      </ContextMenu.Item>

                      <ContextMenu.Item
                        onClick={
                          userCanModifyTrip ? openMacroplanNewDialog : undefined
                        }
                        disabled={!userCanModifyTrip}
                        data-day={day}
                      >
                        New day plan
                      </ContextMenu.Item>
                    </ContextMenu.Content>
                  </ContextMenu.Root>
                );
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
    return prevProps.days === nextProps.days;
  },
);
