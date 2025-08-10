import { Box, Button, Grid } from '@radix-ui/themes';
import type { DateTime } from 'luxon';
import { useMemo } from 'react';

export const DatePickerMode = {
  Single: 'single',
  Range: 'range',
} as const;
export type DatePickerModeType =
  (typeof DatePickerMode)[keyof typeof DatePickerMode];

export interface DatePickerProps {
  value: string;
  min?: DateTime;
  max?: DateTime;
  mode: DatePickerModeType;
  onChange: (value: DateTime) => void;
  disabled?: boolean;
}

export function DatePicker(props: DatePickerProps) {
  return null;
}

export interface CalendarMonthProps {
  yearMonth: DateTime;
  mode: DatePickerModeType;
  onSelectDay?: (date: DateTime) => void;
  onFocusDay?: (date: DateTime) => void;
  onHoverDay?: (date: DateTime) => void;
}

export function CalendarMonth({ yearMonth }: CalendarMonthProps) {
  const startOfMonth = yearMonth.startOf('month');
  const daysInWeekArray = useMemo(() => {
    return Array.from({ length: 7 });
  }, []);
  const daysBeforeStartOfMonthArray = useMemo(() => {
    return Array.from({ length: startOfMonth.weekday - 1 });
  }, [startOfMonth.weekday]);
  const daysInMonthArray = useMemo(() => {
    return Array.from({ length: startOfMonth.daysInMonth ?? 0 });
  }, [startOfMonth.daysInMonth]);
  return (
    <Grid columns="repeat(7, 1fr)" rows="auto" gap="2">
      <Box gridColumnStart="1" gridColumnEnd="8">
        {startOfMonth.toFormat('MMMM yyyy')}
      </Box>
      {/* TODO: implement nav for prev/next month */}
      {daysInWeekArray.map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: no need for unique keys here
        <Box key={i}>
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
          <Button variant="surface" color="gray" key={date.toISODate()}>
            {date.toFormat('d')}
          </Button>
        );
      })}
    </Grid>
  );
}
