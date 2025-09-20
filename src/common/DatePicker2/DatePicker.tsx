import { ArrowLeftIcon, ArrowRightIcon } from '@radix-ui/react-icons';
import { Box, Button, Grid } from '@radix-ui/themes';
import type { DateTime } from 'luxon';
import { useCallback, useMemo, useReducer, useRef } from 'react';
import s from './DatePicker.module.css';

export const DatePickerMode = {
  Single: 'single',
  Range: 'range',
} as const;
export type DatePickerModeType =
  (typeof DatePickerMode)[keyof typeof DatePickerMode];

export interface DatePickerProps {
  value: DateTime;
  min?: DateTime;
  max?: DateTime;
  mode: DatePickerModeType;
  onChange: (value: DateTime) => void;
  disabled?: boolean;
}

interface DatePickerState {
  focusedDate: DateTime;
}
type DatePickerAction = { type: 'setFocusedDate'; date: DateTime };
function datePickerReducer(
  state: DatePickerState,
  action: DatePickerAction,
): DatePickerState {
  console.log('!! datePickerReducer', action);
  switch (action.type) {
    case 'setFocusedDate':
      return { ...state, focusedDate: action.date };
    default:
      return state;
  }
}

export function DatePicker(props: DatePickerProps) {
  const [state, dispatch] = useReducer(datePickerReducer, {
    focusedDate: props.value,
  });

  return (
    <CalendarMonth
      yearMonth={state.focusedDate}
      focusedDate={state.focusedDate}
      mode={props.mode}
      onFocusDay={(date) => dispatch({ type: 'setFocusedDate', date })}
    />
  );
}

export interface CalendarMonthProps {
  yearMonth: DateTime;
  focusedDate: DateTime;
  mode: DatePickerModeType;
  onSelectDay?: (date: DateTime) => void;
  onFocusDay?: (date: DateTime) => void;
  onHoverDay?: (date: DateTime) => void;
}

/**
 * UI only for showing one month calendar, with buttons to navigate prev/next month.
 */
export function CalendarMonth({
  yearMonth,
  focusedDate,
  onFocusDay,
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

  const focusDay = useCallback(
    (date: DateTime) => {
      onFocusDay?.(date);
      // Focus on the button element for the day
      // TODO: the element might not exist yet if navigating to prev/next month
      const dayButton = gridRef.current?.querySelector(
        `button[data-date="${date.toISODate()}"]`,
      );
      if (dayButton) {
        (dayButton as HTMLButtonElement).focus();
      }
    },
    [onFocusDay],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let date: DateTime;

      switch (e.key) {
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

      focusDay(date);
      e.preventDefault();
    },
    [focusedDate, focusDay],
  );

  return (
    <Grid columns="repeat(7, 1fr)" rows="auto" gap="2" ref={gridRef}>
      <Button variant="surface" color="gray" aria-description="Previous month">
        <ArrowLeftIcon />
      </Button>
      <Box gridColumnStart="2" gridColumnEnd="7" className={s.monthLabel}>
        {startOfMonth.toFormat('MMMM yyyy')}
      </Box>
      <Button variant="surface" color="gray" aria-description="Next month">
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
      {/* TODO: Make it focusable, but not using button logic, we don't want each to be tab-able, but when one of them is focused, we can navigate using arrows, even to prev/next month... see handleKeyDown? */}
      {daysInMonthArray.map((_, i) => {
        const date = startOfMonth.set({ day: i + 1 });
        return (
          <Button
            variant="surface"
            color="gray"
            key={date.toISODate()}
            onKeyDown={handleKeyDown}
            tabIndex={date.hasSame(focusedDate, 'day') ? 0 : -1}
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
