import clsx from 'clsx';
import type React from 'react';
import { useCallback, useState } from 'react';
import { useTripTimetableDragging } from '../store/hooks';
import s from './Timetable.module.scss';

interface TimetableCellProps {
  row: string;
  column: string;
  children?: React.ReactNode;
}

export function TimetableCell({ row, column, children }: TimetableCellProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { timetableDragging } = useTripTimetableDragging();

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      if (!isDragOver) {
        setIsDragOver(true);
      }
    },
    [isDragOver],
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Drag-and-drop events are used
    <div
      className={clsx(s.timetableCell, {
        [s.dragging]: isDragOver && timetableDragging.source.mode === 'drag',
        [s.resizing]: isDragOver && timetableDragging.source.mode === 'resize',
      })}
      data-grid-cell={true}
      data-grid-row={row}
      data-grid-column={column}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDragLeave}
    >
      {children}
    </div>
  );
}
