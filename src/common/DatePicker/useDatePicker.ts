import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type DaysOfWeek,
  getToday,
  PlainDate,
  PlainYearMonth,
  toDate,
} from './temporal';

export type Pagination = 'single' | 'months';

interface UseDatePickerOptions {
  value: string;
  min?: string;
  max?: string;
  mode: 'single' | 'range';
  firstDayOfWeek: DaysOfWeek;
  isDateDisallowed?: (date: Date) => boolean;
  locale?: string;
  formatWeekday: 'narrow' | 'short' | 'long';
  showOutsideDays: boolean;
  months: number;
  focusedDate?: PlainDate;
  setFocusedDate: (date: PlainDate) => void;
}

function safeFrom<T extends PlainDate | PlainYearMonth>(
  Ctr: { from(value: string): T },
  value: string | undefined,
) {
  if (value) {
    try {
      return Ctr.from(value);
    } catch {
      // ignore parse errors
    }
  }
}

function diffInMonths(a: PlainYearMonth, b: PlainYearMonth): number {
  return (b.year - a.year) * 12 + b.month - a.month;
}

const createPage = (start: PlainYearMonth, months: number) => {
  start = months === 12 ? new PlainYearMonth(start.year, 1) : start;
  return {
    start,
    end: start.add({ months: months - 1 }),
  };
};

export function useDatePicker(options: UseDatePickerOptions) {
  const {
    value,
    min,
    max,
    mode,
    firstDayOfWeek,
    isDateDisallowed,
    locale,
    formatWeekday,
    showOutsideDays,
    months,
    focusedDate,
    setFocusedDate,
  } = options;

  // Parse dates
  const minDate = useMemo(() => safeFrom(PlainDate, min), [min]);
  const maxDate = useMemo(() => safeFrom(PlainDate, max), [max]);
  const todaysDate = useMemo(() => getToday(), []);

  // Parse current value
  const currentDate = useMemo(() => {
    if (mode === 'single') {
      return safeFrom(PlainDate, value);
    }
    return undefined;
  }, [value, mode]);

  const currentRange = useMemo((): [PlainDate, PlainDate] | [] => {
    if (mode === 'range' && value?.includes('/')) {
      const [s, e] = value.split('/');
      const start = safeFrom(PlainDate, s);
      const end = safeFrom(PlainDate, e);
      return start && end ? [start, end] : [];
    }
    return [];
  }, [value, mode]);

  // Initialize focused date - ensure it's never undefined
  const ensuredFocusedDate = useMemo((): PlainDate => {
    if (focusedDate) return focusedDate;
    if (mode === 'single' && currentDate) return currentDate;
    if (mode === 'range' && currentRange.length > 0 && currentRange[0])
      return currentRange[0];
    return todaysDate;
  }, [focusedDate, mode, currentDate, currentRange, todaysDate]);

  // Set initial focused date if not provided
  useEffect(() => {
    if (!focusedDate) {
      setFocusedDate(ensuredFocusedDate);
    }
  }, [focusedDate, setFocusedDate, ensuredFocusedDate]);

  // Always use ensuredFocusedDate to avoid undefined
  const activeFocusedDate = ensuredFocusedDate;

  // Pagination state
  const [page, setPage] = useState(() =>
    createPage(activeFocusedDate.toPlainYearMonth(), months),
  );

  // Range selection state for range mode
  const [tentativeStart, setTentativeStart] = useState<PlainDate | undefined>();
  const [hoveredDate, setHoveredDate] = useState<PlainDate | undefined>();

  // Update pagination based on focused date
  const step = months;
  const updatePageBy = useCallback(
    (by: number) => setPage(createPage(page.start.add({ months: by }), months)),
    [page.start, months],
  );

  const contains = useCallback(
    (date: PlainDate) => {
      const diff = diffInMonths(page.start, date.toPlainYearMonth());
      return diff >= 0 && diff < months;
    },
    [page.start, months],
  );

  // Page change -> update focused date
  useEffect(() => {
    if (contains(activeFocusedDate)) {
      return;
    }

    const diff = diffInMonths(activeFocusedDate.toPlainYearMonth(), page.start);
    const newFocusedDate = activeFocusedDate.add({ months: diff });
    setFocusedDate(newFocusedDate);
  }, [page.start, activeFocusedDate, contains, setFocusedDate]);

  // Focused date change -> update page
  useEffect(() => {
    if (contains(activeFocusedDate)) {
      return;
    }

    const diff = diffInMonths(page.start, activeFocusedDate.toPlainYearMonth());

    // if we only move one month either way, move by step
    if (diff === -1) {
      updatePageBy(-step);
    } else if (diff === months) {
      updatePageBy(step);
    } else {
      // anything else, move in steps of months
      updatePageBy(Math.floor(diff / months) * months);
    }
  }, [activeFocusedDate, step, months, contains, updatePageBy, page.start]);

  // Navigation functions
  const canGoPrevious = useMemo(() => {
    if (!minDate) return true;
    const prevMonth = page.start.add({ months: -step });
    const prevEnd = createPage(prevMonth, months).end;
    return PlainDate.compare(prevEnd.toPlainDate(), minDate) >= 0;
  }, [minDate, page.start, step, months]);

  const canGoNext = useMemo(() => {
    if (!maxDate) return true;
    const nextMonth = page.start.add({ months: step });
    return PlainDate.compare(nextMonth.toPlainDate(), maxDate) <= 0;
  }, [maxDate, page.start, step]);

  const previous = canGoPrevious ? () => updatePageBy(-step) : undefined;

  const next = canGoNext ? () => updatePageBy(step) : undefined;

  // Date formatters
  const format = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'long',
      }),
    [locale],
  );

  const formatVerbose = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'long',
      }),
    [locale],
  );

  // Header text
  const headerText = useMemo(() => {
    const start = toDate(page.start.toPlainDate());
    const end = toDate(page.end.toPlainDate());
    return format.formatRange(start, end);
  }, [page, format]);

  // Day names
  const dayNames = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone: 'UTC',
      weekday: formatWeekday,
    });
    const days = [];
    const day = new Date();

    for (let i = 0; i < 7; i++) {
      const index = (day.getUTCDay() - firstDayOfWeek + 7) % 7;
      days[index] = formatter.format(day);
      day.setUTCDate(day.getUTCDate() + 1);
    }

    return days;
  }, [locale, formatWeekday, firstDayOfWeek]);

  // Range selection handler
  const handleRangeSelect = useCallback(
    (selectedDate: PlainDate): string | undefined => {
      if (!tentativeStart) {
        setTentativeStart(selectedDate);
        setHoveredDate(undefined);
        return selectedDate.toString(); // Return partial selection
      } else {
        const [start, end] =
          PlainDate.compare(tentativeStart, selectedDate) <= 0
            ? [tentativeStart, selectedDate]
            : [selectedDate, tentativeStart];
        setTentativeStart(undefined);
        setHoveredDate(undefined);
        return `${start.toString()}/${end.toString()}`;
      }
    },
    [tentativeStart],
  );

  // Hover handler for range mode
  const onHoverDay = useCallback(
    (hoveredDate: PlainDate) => {
      if (mode === 'range' && tentativeStart) {
        setHoveredDate(hoveredDate);
      }
    },
    [mode, tentativeStart],
  );

  // Get current selection for rendering
  const getCurrentSelection = useCallback(() => {
    if (mode === 'single') {
      return currentDate ? [currentDate] : [];
    } else {
      // Range mode
      if (tentativeStart) {
        const end = hoveredDate || tentativeStart;
        const [start, endDate] =
          PlainDate.compare(tentativeStart, end) <= 0
            ? [tentativeStart, end]
            : [end, tentativeStart];
        return [start, endDate];
      }
      return currentRange;
    }
  }, [mode, currentDate, currentRange, tentativeStart, hoveredDate]);

  return {
    // Page info
    page,
    headerText,
    dayNames,

    // Navigation
    previous,
    next,

    // Date constraints
    min: minDate,
    max: maxDate,
    today: todaysDate,
    focusedDate: activeFocusedDate,

    // Configuration
    firstDayOfWeek,
    isDateDisallowed,
    showOutsideDays,
    formatWeekday,
    locale,
    mode,

    // Current selection
    getCurrentSelection,

    // Range mode handlers
    handleRangeSelect,
    onHoverDay,
    tentativeStart,

    // Formatters
    format,
    formatVerbose,
  };
}
