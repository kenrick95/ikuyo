import { ContextMenu } from '@radix-ui/themes';
import type { CSSProperties, RefObject } from 'react';
import { memo, useRef } from 'react';
import { TimetableCell } from './TimetableCell';
import { useInViewport } from './useInViewport';
import {
  slotActions,
  type TimetableAction,
  type TimetableSlot,
} from './useTimetableSlotActions';

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
  onSelect: (action: TimetableAction, slot: TimetableSlot) => void;
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
  onSelect,
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
            {slotActions.map(({ id, label }) => (
              <ContextMenu.Item
                key={id}
                disabled={!userCanModifyTrip}
                onSelect={() =>
                  onSelect(id, {
                    dayOfTrip: day,
                    timeStart: timeStr,
                    instant,
                    date,
                  })
                }
              >
                {label}
              </ContextMenu.Item>
            ))}
          </ContextMenu.Content>
        </ContextMenu.Root>
      ) : null}
    </div>
  );
}

export const TimetableDragTarget = memo(TimetableDragTargetInner);
