import { ArrowLeftIcon, ArrowRightIcon } from '@radix-ui/react-icons';
import { Box, Button, Grid } from '@radix-ui/themes';
import clsx from 'clsx';
import { DateTime } from 'luxon';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import s from './CalendarMonth.module.css';

export interface CalendarMonthProps {
  yearMonth: DateTime;
  focusedDate: DateTime;
  selectedDate?: DateTime;
  onSelectDay: (date: DateTime) => void;
  onFocusDay: (date: DateTime) => void;
  onHoverDay: (date: DateTime) => void;
  min?: DateTime;
  max?: DateTime;
  disabled?: boolean;
  className?: string;
}
/**
 * UI only for showing one month calendar, with buttons to navigate prev/next month.
 */
export function CalendarMonth({
  yearMonth,
  focusedDate,
  selectedDate,
  onFocusDay,
  onSelectDay,
  onHoverDay,
  min,
  max,
  disabled,
  className,
}: CalendarMonthProps) {
  const startOfMonth = yearMonth.startOf('month');
  const dayOfWeekArray = useMemo(() => {
    return Array.from({ length: 7 });
  }, []);
  const daysBeforeStartOfMonthArray = useMemo(() => {
    return Array.from({ length: startOfMonth.weekday - 1 });
  }, [startOfMonth.weekday]);
  const daysInMonthArray = useMemo(() => {
    return Array.from({ length: startOfMonth.daysInMonth ?? 0 });
  }, [startOfMonth.daysInMonth]);
  const gridRef = useRef<HTMLDivElement>(null);
  // When the calendar is opened, focus is moved to the selected date
  const [isDayButtonFocused, setIsDayButtonFocused] = useState(true);

  const focusDayButton = useCallback(
    (date: DateTime) => {
      setIsDayButtonFocused(true);
      onFocusDay(date);
    },
    [onFocusDay],
  );

  const handleFocus = useCallback(() => {
    setIsDayButtonFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsDayButtonFocused(false);
  }, []);
  useLayoutEffect(() => {
    if (isDayButtonFocused) {
      const dayButton = gridRef.current?.querySelector(
        `button[data-date="${focusedDate.toISODate()}"]`,
      );
      if (dayButton) {
        (dayButton as HTMLButtonElement).focus();
      }
    }
  }, [focusedDate, isDayButtonFocused]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let date: DateTime;

      switch (e.key) {
        // Reference: https://github.com/WickyNilliams/cally/blob/38e6a7bc7c53e29c427f5de028b8544e2bff9a9d/src/calendar-month/useCalendarMonth.ts#L74-L101
        // MIT License (c) WickyNilliams
        case 'ArrowRight':
          date = focusedDate.plus({ days: 1 });
          break;
        case 'ArrowLeft':
          date = focusedDate.plus({ days: -1 });
          break;
        case 'ArrowDown':
          date = focusedDate.plus({ days: 7 });
          break;
        case 'ArrowUp':
          date = focusedDate.plus({ days: -7 });
          break;
        case 'PageUp':
          date = focusedDate.plus(e.shiftKey ? { years: -1 } : { months: -1 });
          break;
        case 'PageDown':
          date = focusedDate.plus(e.shiftKey ? { years: 1 } : { months: 1 });
          break;
        case 'Home':
          date = focusedDate.startOf('week');
          break;
        case 'End':
          date = focusedDate.endOf('week');
          break;
        default:
          return;
      }

      focusDayButton(getDateInRange(date, min, max));
      e.preventDefault();
    },
    [focusedDate, focusDayButton, min, max],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const dateStr = target.getAttribute('data-date');
      if (dateStr) {
        const date = DateTime.fromISO(dateStr);
        if (!isDateInRange(date, min, max)) {
          return;
        }
        focusDayButton(date);
        onSelectDay(date);
      }
    },
    [onSelectDay, focusDayButton, min, max],
  );

  const handleMouseOver = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const dateStr = target.getAttribute('data-date');
      if (dateStr) {
        const date = DateTime.fromISO(dateStr);
        if (!isDateInRange(date, min, max)) {
          return;
        }
        onHoverDay(date);
      }
    },
    [onHoverDay, min, max],
  );

  const handlePreviousMonth = useCallback(() => {
    const prevMonth = getDateInRange(
      startOfMonth.plus({ months: -1 }),
      min,
      max,
    );
    onFocusDay(prevMonth);
  }, [startOfMonth, onFocusDay, min, max]);

  const handleNextMonth = useCallback(() => {
    const nextMonth = getDateInRange(
      startOfMonth.plus({ months: 1 }),
      min,
      max,
    );
    onFocusDay(nextMonth);
  }, [startOfMonth, onFocusDay, min, max]);

  return (
    <Grid
      columns="repeat(7, 1fr)"
      rows="auto"
      gap="2"
      ref={gridRef}
      className={clsx(s.calendarMonth, className)}
    >
      <Button
        variant="surface"
        color="gray"
        aria-description="Previous month"
        onClick={handlePreviousMonth}
        className={s.prevMonthButton}
      >
        <ArrowLeftIcon />
      </Button>
      <Box gridColumnStart="2" gridColumnEnd="7" className={s.monthLabel}>
        {startOfMonth.toFormat('MMMM yyyy')}
      </Box>
      <Button
        variant="surface"
        color="gray"
        aria-description="Next month"
        onClick={handleNextMonth}
        className={s.nextMonthButton}
      >
        <ArrowRightIcon />
      </Button>
      {dayOfWeekArray.map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: no need for unique keys here
        <Box key={i} className={s.dayOfWeekLabel}>
          {startOfMonth.startOf('week').plus({ days: i }).toFormat('ccc')}
        </Box>
      ))}
      {daysBeforeStartOfMonthArray.map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: no need for unique keys here
        <Box key={i} />
      ))}
      {daysInMonthArray.map((_, i) => {
        const date = startOfMonth.set({ day: i + 1 });
        const isFocused = date.hasSame(focusedDate, 'day');
        const isSelected = selectedDate
          ? date.hasSame(selectedDate, 'day')
          : false;
        const isDisabled = disabled || !isDateInRange(date, min, max);

        return (
          <Button
            disabled={isDisabled}
            variant={isSelected ? 'solid' : 'surface'}
            color={isSelected ? undefined : 'gray'}
            key={date.toISODate()}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onClick={handleClick}
            onMouseOver={handleMouseOver}
            tabIndex={isFocused ? 0 : -1}
            data-date={date.toISODate()}
            className={s.dayButton}
          >
            {date.toFormat('d')}
          </Button>
        );
      })}
    </Grid>
  );
}

function isDateInRange(date: DateTime, start?: DateTime, end?: DateTime) {
  if (start != null && end != null) {
    return date >= start && date <= end;
  } else if (start != null) {
    return date >= start;
  } else if (end != null) {
    return date <= end;
  }
  return true;
}
function getDateInRange(date: DateTime, start?: DateTime, end?: DateTime) {
  if (start != null && date < start) {
    return start;
  }
  if (end != null && date > end) {
    return end;
  }
  return date;
}
