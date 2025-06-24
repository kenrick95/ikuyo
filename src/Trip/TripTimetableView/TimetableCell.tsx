import clsx from 'clsx';
import type React from 'react';
import { useState } from 'react';
import s from './Timetable.module.scss';

interface TimetableCellProps {
  row: string;
  column: string;
  children?: React.ReactNode;
}

export function TimetableCell({ row, column, children }: TimetableCellProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Drag-and-drop events are used
    <div
      className={clsx(s.timetableCell, { [s.dragOver]: isDragOver })}
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
