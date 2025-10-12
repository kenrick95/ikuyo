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
  // A11Y: Phase 2 - Live announcements for month navigation
  onLiveAnnouncement?: (message: string) => void;
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
  onLiveAnnouncement,
}: CalendarMonthProps) {
  const startOfMonth = yearMonth.startOf('month');
  const dayOfWeekArray = useMemo(() => {
    return Array.from({ length: 7 })
      .fill(0)
      .map((_, i) => {
        const dateTime = startOfMonth.startOf('week').plus({ days: i });
        return {
          abbr: dateTime.toFormat('ccc'),
          full: dateTime.toFormat('cccc'),
        };
      });
  }, [startOfMonth]);
  const daysBeforeStartOfMonthArray = useMemo(() => {
    return Array.from({ length: startOfMonth.weekday - 1 }).map((_, i) => i);
  }, [startOfMonth.weekday]);
  const daysInMonthArray = useMemo(() => {
    return Array.from({ length: startOfMonth.daysInMonth ?? 0 }).map(
      (_, i) => i,
    );
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
        case 'Enter':
        case ' ':
          // Space and Enter should select the focused date
          if (!isDateInRange(focusedDate, min, max)) {
            return;
          }
          onSelectDay(focusedDate);
          e.preventDefault();
          return;
        default:
          return;
      }

      focusDayButton(getDateInRange(date, min, max));
      e.preventDefault();
    },
    [focusedDate, focusDayButton, min, max, onSelectDay],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const dateStr = target.getAttribute('data-date');
      const dateZone = target.getAttribute('data-timezone');
      if (dateStr) {
        const date = DateTime.fromISO(dateStr, { zone: dateZone ?? undefined });
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
      const dateZone = target.getAttribute('data-timezone');
      if (dateStr) {
        const date = DateTime.fromISO(dateStr, { zone: dateZone ?? undefined });
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
    onLiveAnnouncement?.(prevMonth.toFormat('MMMM yyyy'));
  }, [startOfMonth, onFocusDay, min, max, onLiveAnnouncement]);

  const handleNextMonth = useCallback(() => {
    const nextMonth = getDateInRange(
      startOfMonth.plus({ months: 1 }),
      min,
      max,
    );
    onFocusDay(nextMonth);
    onLiveAnnouncement?.(nextMonth.toFormat('MMMM yyyy'));
  }, [startOfMonth, onFocusDay, min, max, onLiveAnnouncement]);

  const isPrevMonthDisabled = min && startOfMonth <= min.startOf('month');
  const isNextMonthDisabled = max && startOfMonth >= max.startOf('month');

  return (
    <Grid
      columns="repeat(7, 1fr)"
      rows="repeat(7, 35px)"
      gap="1"
      ref={gridRef}
      className={clsx(s.calendarMonth, className)}
      role="grid"
      aria-label={`Calendar for ${startOfMonth.toFormat('MMMM yyyy')}`}
    >
      <Button
        variant="surface"
        color="gray"
        aria-label="Previous month"
        onClick={handlePreviousMonth}
        className={s.prevMonthButton}
        disabled={disabled || isPrevMonthDisabled}
      >
        <ArrowLeftIcon aria-hidden="true" />
      </Button>
      <Box gridColumnStart="2" gridColumnEnd="7" className={s.monthLabel}>
        {startOfMonth.toFormat('MMMM yyyy')}
      </Box>
      <Button
        variant="surface"
        color="gray"
        aria-label="Next month"
        onClick={handleNextMonth}
        className={s.nextMonthButton}
        disabled={disabled || isNextMonthDisabled}
      >
        <ArrowRightIcon aria-hidden="true" />
      </Button>
      {dayOfWeekArray.map(({ abbr, full }) => (
        <abbr
          title={full}
          aria-label={full}
          key={abbr}
          className={s.dayOfWeekLabel}
        >
          {abbr}
        </abbr>
      ))}
      {daysBeforeStartOfMonthArray.map((i) => (
        <Box key={i} />
      ))}
      {daysInMonthArray.map((i) => {
        const date = startOfMonth.set({ day: i + 1 });
        const isFocused = date.hasSame(focusedDate, 'day');
        const isSelected = selectedDate
          ? date.hasSame(selectedDate, 'day')
          : false;
        const isDisabled = disabled || !isDateInRange(date, min, max);
        // A11Y: Mark today's date for screen readers
        const isToday = date.hasSame(DateTime.now(), 'day');

        return (
          // biome-ignore lint/a11y/useSemanticElements: this is a button on a grid
          <button
            type="button"
            role="gridcell"
            disabled={isDisabled}
            key={date.toISODate()}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onClick={handleClick}
            onMouseOver={handleMouseOver}
            tabIndex={isFocused ? 0 : -1}
            data-date={date.toISODate()}
            data-timezone={date.zoneName}
            className={clsx(s.dayButton, {
              [s.dayButtonSelected]: isSelected,
            })}
            aria-label={date.toFormat('cccc, MMMM d, yyyy')}
            aria-selected={isSelected}
            aria-current={isToday ? 'date' : undefined}
          >
            {date.toFormat('d')}
          </button>
        );
      })}
    </Grid>
  );
}

function isDateInRange(date: DateTime, start?: DateTime, end?: DateTime) {
  // console.log('isDateInRange', { date, start, end });
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
