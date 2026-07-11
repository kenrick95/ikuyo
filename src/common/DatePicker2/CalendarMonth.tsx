import { ArrowLeftIcon, ArrowRightIcon } from '@radix-ui/react-icons';
import { Box, Button, Grid } from '@radix-ui/themes';
import clsx from 'clsx';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import s from './CalendarMonth.module.css';

function formatMonthYear(date: Temporal.PlainDate) {
  return date.toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function formatDate(date: Temporal.PlainDate) {
  return date.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export interface CalendarMonthProps {
  yearMonth: Temporal.PlainDate;
  focusedDate: Temporal.PlainDate;
  selectedDate?: Temporal.PlainDate;
  onSelectDay: (date: Temporal.PlainDate) => void;
  onFocusDay: (date: Temporal.PlainDate) => void;
  onHoverDay: (date: Temporal.PlainDate) => void;
  min?: Temporal.PlainDate;
  max?: Temporal.PlainDate;
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
  const startOfMonth = useMemo(() => {
    return yearMonth.with({ day: 1 });
  }, [yearMonth]);
  const dayOfWeekArray = useMemo(() => {
    const formatterAbbr = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
    });
    const formatterFull = new Intl.DateTimeFormat('en-US', { weekday: 'long' });
    return Array.from({ length: 7 })
      .fill(0)
      .map((_, i) => {
        // "Mon"-"Sun"
        const dateTime = startOfMonth.add({
          days: i - startOfMonth.dayOfWeek - 1,
        });
        return {
          abbr: formatterAbbr.format(dateTime),
          full: formatterFull.format(dateTime),
        };
      });
  }, [startOfMonth]);
  const daysBeforeStartOfMonthArray = useMemo(() => {
    return Array.from({ length: startOfMonth.dayOfWeek - 1 }).map((_, i) => i);
  }, [startOfMonth.dayOfWeek]);
  const daysInMonthArray = useMemo(() => {
    return Array.from({ length: startOfMonth.daysInMonth ?? 0 }).map(
      (_, i) => i,
    );
  }, [startOfMonth.daysInMonth]);
  const gridRef = useRef<HTMLDivElement>(null);
  // When the calendar is opened, focus is moved to the selected date
  const [isDayButtonFocused, setIsDayButtonFocused] = useState(true);

  const focusDayButton = useCallback(
    (date: Temporal.PlainDate) => {
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
        `button[data-date="${focusedDate.toString()}"]`,
      );
      if (dayButton) {
        (dayButton as HTMLButtonElement).focus();
      }
    }
  }, [focusedDate, isDayButtonFocused]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let date: Temporal.PlainDate;

      switch (e.key) {
        // Reference: https://github.com/WickyNilliams/cally/blob/38e6a7bc7c53e29c427f5de028b8544e2bff9a9d/src/calendar-month/useCalendarMonth.ts#L74-L101
        // MIT License (c) WickyNilliams
        case 'ArrowRight':
          date = focusedDate.add({ days: 1 });
          break;
        case 'ArrowLeft':
          date = focusedDate.add({ days: -1 });
          break;
        case 'ArrowDown':
          date = focusedDate.add({ days: 7 });
          break;
        case 'ArrowUp':
          date = focusedDate.add({ days: -7 });
          break;
        case 'PageUp':
          date = focusedDate.add(e.shiftKey ? { years: -1 } : { months: -1 });
          break;
        case 'PageDown':
          date = focusedDate.add(e.shiftKey ? { years: 1 } : { months: 1 });
          break;
        case 'Home':
          // Move to the first day of the week (Monday: 1); dayOfWeek is 1-7 (Monday-Sunday)
          date = focusedDate.subtract({ days: focusedDate.dayOfWeek + 1 });
          break;
        case 'End':
          // Move to the last day of the week (Sunday: 7); dayOfWeek is 1-7 (Monday-Sunday)
          date = focusedDate.add({ days: 7 - focusedDate.dayOfWeek + 1 });
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
      if (dateStr) {
        const date = Temporal.PlainDate.from(dateStr);
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
        const date = Temporal.PlainDate.from(dateStr);
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
      startOfMonth.add({ months: -1 }),
      min,
      max,
    );
    onFocusDay(prevMonth);
    onLiveAnnouncement?.(formatMonthYear(prevMonth));
  }, [startOfMonth, onFocusDay, min, max, onLiveAnnouncement]);

  const handleNextMonth = useCallback(() => {
    const nextMonth = getDateInRange(startOfMonth.add({ months: 1 }), min, max);
    onFocusDay(nextMonth);
    onLiveAnnouncement?.(formatMonthYear(nextMonth));
  }, [startOfMonth, onFocusDay, min, max, onLiveAnnouncement]);

  const isPrevMonthDisabled = useMemo(() => {
    if (!min) {
      return false;
    }
    const minStartofMonth = min.with({ day: 1 });
    // Temporal.PlainDate.compare: Returns -1 if date1 comes before date2, 0 if they are the same, and 1 if date1 comes after date2
    return Temporal.PlainDate.compare(startOfMonth, minStartofMonth) <= 0;
  }, [min, startOfMonth]);
  const isNextMonthDisabled = useMemo(() => {
    if (!max) {
      return false;
    }
    const maxStartofMonth = max.with({ day: 1 });
    return Temporal.PlainDate.compare(startOfMonth, maxStartofMonth) >= 0;
  }, [max, startOfMonth]);

  return (
    <Grid
      columns="repeat(7, 1fr)"
      rows="repeat(7, 35px)"
      gap="1"
      ref={gridRef}
      className={clsx(s.calendarMonth, className)}
      role="grid"
      aria-label={`Calendar for ${startOfMonth}`}
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
        {formatMonthYear(startOfMonth)}
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
        const date = startOfMonth.with({ day: i + 1 });
        const isFocused = date.equals(focusedDate);
        const isSelected = selectedDate ? date.equals(selectedDate) : false;
        const isDisabled = disabled || !isDateInRange(date, min, max);
        // A11Y: Mark today's date for screen readers
        const isToday = date.equals(Temporal.Now.plainDateISO());

        return (
          // biome-ignore lint/a11y/useSemanticElements: this is a button on a grid
          <button
            type="button"
            role="gridcell"
            disabled={isDisabled}
            key={date.toString()}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onClick={handleClick}
            onMouseOver={handleMouseOver}
            tabIndex={isFocused ? 0 : -1}
            data-date={date.toString()}
            className={clsx(s.dayButton, {
              [s.dayButtonSelected]: isSelected,
            })}
            aria-label={formatDate(date)}
            aria-selected={isSelected}
            aria-current={isToday ? 'date' : undefined}
          >
            {date.day}
          </button>
        );
      })}
    </Grid>
  );
}

function isDateInRange(
  date: Temporal.PlainDate,
  start?: Temporal.PlainDate,
  end?: Temporal.PlainDate,
) {
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
function getDateInRange(
  date: Temporal.PlainDate,
  start?: Temporal.PlainDate,
  end?: Temporal.PlainDate,
) {
  if (start != null && date < start) {
    return start;
  }
  if (end != null && date > end) {
    return end;
  }
  return date;
}
