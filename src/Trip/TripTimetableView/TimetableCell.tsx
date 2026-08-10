import clsx from 'clsx';
import type { ComponentPropsWithoutRef, DragEvent } from 'react';
import { forwardRef, useCallback, useState } from 'react';
import { useTripTimetableDragging } from '../store/hooks';
import s from './Timetable.module.scss';

interface TimetableCellProps extends ComponentPropsWithoutRef<'div'> {
  row: string;
  column: string;
}

export const TimetableCell = forwardRef<HTMLDivElement, TimetableCellProps>(
  function TimetableCell({ row, column, children, className, ...props }, ref) {
    const [isDragOver, setIsDragOver] = useState(false);
    const { timetableDragging } = useTripTimetableDragging();

    const handleDragOver = useCallback(
      (e: DragEvent<HTMLDivElement>) => {
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
        {...props}
        ref={ref}
        className={clsx(
          s.timetableCell,
          {
            [s.dragging]:
              isDragOver && timetableDragging.source.mode === 'drag',
            [s.resizing]:
              isDragOver && timetableDragging.source.mode === 'resize',
          },
          className,
        )}
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
  },
);
