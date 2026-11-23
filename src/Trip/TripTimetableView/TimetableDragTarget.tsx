import { ContextMenu } from '@radix-ui/themes';
import type { CSSProperties, MouseEvent, RefObject } from 'react';
import { memo, useRef } from 'react';
import { TimetableCell } from './TimetableCell';
import { useInViewport } from './useInViewport';

interface TimetableDragTargetProps {
  day: number;
  timeStr: string;
  instant?: number;
  date?: string;
  columnStr: string;
  gridStyle: CSSProperties;
  scrollContainerRef: RefObject<HTMLElement | null>;
  tripTitle?: string;
  userCanModifyTrip: boolean;
  onNewActivity: (e: MouseEvent<HTMLDivElement>) => void;
  onNewFlight: (e: MouseEvent<HTMLDivElement>) => void;
  onNewTrain: (e: MouseEvent<HTMLDivElement>) => void;
  onNewAccommodation: (e: MouseEvent<HTMLDivElement>) => void;
  onNewMacroplan: (e: MouseEvent<HTMLDivElement>) => void;
}

function TimetableDragTargetInner({
  day,
  timeStr,
  instant,
  date,
  columnStr,
  gridStyle,
  scrollContainerRef,
  tripTitle,
  userCanModifyTrip,
  onNewActivity,
  onNewFlight,
  onNewTrain,
  onNewAccommodation,
  onNewMacroplan,
}: TimetableDragTargetProps) {
  const placeholderRef = useRef<HTMLDivElement>(null);
  const isInViewport = useInViewport(placeholderRef, scrollContainerRef);

  return (
    <div ref={placeholderRef} style={gridStyle} data-time-slot={instant}>
      {isInViewport ? (
        <ContextMenu.Root>
          <ContextMenu.Trigger>
            <TimetableCell
              row={`t${timeStr}`}
              column={columnStr}
              data-instant={instant}
            />
          </ContextMenu.Trigger>
          <ContextMenu.Content>
            <ContextMenu.Label>{tripTitle}</ContextMenu.Label>
            <ContextMenu.Item
              onClick={userCanModifyTrip ? onNewActivity : undefined}
              disabled={!userCanModifyTrip}
              data-time-start={timeStr}
              data-day={day}
              data-instant={instant}
              data-date={date}
            >
              New activity
            </ContextMenu.Item>
            <ContextMenu.Item
              onClick={userCanModifyTrip ? onNewFlight : undefined}
              disabled={!userCanModifyTrip}
              data-time-start={timeStr}
              data-day={day}
              data-instant={instant}
              data-date={date}
            >
              New flight
            </ContextMenu.Item>
            <ContextMenu.Item
              onClick={userCanModifyTrip ? onNewTrain : undefined}
              disabled={!userCanModifyTrip}
              data-time-start={timeStr}
              data-day={day}
              data-instant={instant}
              data-date={date}
            >
              New train
            </ContextMenu.Item>
            <ContextMenu.Item
              onClick={userCanModifyTrip ? onNewAccommodation : undefined}
              disabled={!userCanModifyTrip}
              data-day={day}
              data-instant={instant}
              data-date={date}
            >
              New accommodation
            </ContextMenu.Item>
            <ContextMenu.Item
              onClick={userCanModifyTrip ? onNewMacroplan : undefined}
              disabled={!userCanModifyTrip}
              data-day={day}
              data-instant={instant}
              data-date={date}
            >
              New day plan
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>
      ) : null}
    </div>
  );
}

export const TimetableDragTarget = memo(TimetableDragTargetInner);
