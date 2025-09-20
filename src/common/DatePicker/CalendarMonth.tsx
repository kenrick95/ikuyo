import { useCallback, useMemo } from 'react';
import styles from './CalendarMonth.module.css';
import {
  clamp,
  type DaysOfWeek,
  endOfWeek,
  getViewOfMonth,
  type PlainDate,
  type PlainYearMonth,
  startOfWeek,
  toDate,
} from './temporal';

interface CalendarMonthProps {
  offset: number;
  page: { start: PlainYearMonth; end: PlainYearMonth };
  min?: PlainDate;
  max?: PlainDate;
  today: PlainDate;
  focusedDate: PlainDate;
  firstDayOfWeek: DaysOfWeek;
  isDateDisallowed?: (date: Date) => boolean;
  showOutsideDays: boolean;
  formatWeekday: 'narrow' | 'short' | 'long';
  locale?: string;
  mode: 'single' | 'range';
  getCurrentSelection: () => PlainDate[];
  tentativeStart?: PlainDate;
  dayNames: string[];
  onSelectDay: (date: PlainDate) => void;
  onFocusDay: (date: PlainDate) => void;
  onHoverDay?: (date: PlainDate) => void;
}

const inRange = (date: PlainDate, min?: PlainDate, max?: PlainDate) =>
  clamp(date, min, max).equals(date);

const isLTR = (e: React.KeyboardEvent) =>
  (e.target as HTMLElement).matches(':dir(ltr)');

export function CalendarMonth({
  offset,
  page,
  min,
  max,
  today,
  focusedDate,
  firstDayOfWeek,
  isDateDisallowed,
  showOutsideDays,
  formatWeekday,
  locale,
  mode,
  getCurrentSelection,
  tentativeStart,
  dayNames,
  onSelectDay,
  onFocusDay,
  onHoverDay,
}: CalendarMonthProps) {
  const yearMonth = useMemo(
    () => page.start.add({ months: offset }),
    [page, offset],
  );

  const weeks = useMemo(
    () => getViewOfMonth(yearMonth, firstDayOfWeek),
    [yearMonth, firstDayOfWeek],
  );

  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        timeZone: 'UTC',
        month: 'long',
        day: 'numeric',
      }),
    [locale],
  );

  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        timeZone: 'UTC',
        month: 'long',
        year: 'numeric',
      }),
    [locale],
  );

  const currentSelection = getCurrentSelection();

  const focusDay = useCallback(
    (date: PlainDate) => {
      onFocusDay(clamp(date, min, max));
    },
    [onFocusDay, min, max],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let date: PlainDate;

      switch (e.key) {
        case 'ArrowRight':
          date = focusedDate.add({ days: isLTR(e) ? 1 : -1 });
          break;
        case 'ArrowLeft':
          date = focusedDate.add({ days: isLTR(e) ? -1 : 1 });
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
          date = startOfWeek(focusedDate, firstDayOfWeek);
          break;
        case 'End':
          date = endOfWeek(focusedDate, firstDayOfWeek);
          break;
        default:
          return;
      }

      focusDay(date);
      e.preventDefault();
    },
    [focusedDate, firstDayOfWeek, focusDay],
  );

  const getDayProps = useCallback(
    (date: PlainDate) => {
      const isInMonth = yearMonth.equals(date);

      // days outside of month are only shown if `showOutsideDays` is true
      if (!showOutsideDays && !isInMonth) {
        return null;
      }

      const isFocusedDay = date.equals(focusedDate);
      const isToday = date.equals(today);
      const asDate = toDate(date);
      const isDisallowed = isDateDisallowed?.(asDate) ?? false;
      const isDisabled = !inRange(date, min, max);

      let isSelected = false;
      let isRangeStart = false;
      let isRangeEnd = false;
      let isRangeInner = false;

      if (mode === 'range') {
        if (currentSelection.length === 2) {
          const [start, end] = currentSelection;
          isRangeStart = start.equals(date);
          isRangeEnd = end.equals(date);
          isSelected = inRange(date, start, end);
          isRangeInner = isSelected && !isRangeStart && !isRangeEnd;
        } else if (tentativeStart?.equals(date)) {
          isSelected = true;
          isRangeStart = true;
        }
      } else {
        isSelected = currentSelection.some((d) => d.equals(date));
      }

      return {
        date,
        isInMonth,
        isFocusedDay,
        isToday,
        isDisallowed,
        isDisabled,
        isSelected,
        isRangeStart,
        isRangeEnd,
        isRangeInner,
        label: dayFormatter.format(asDate),
      };
    },
    [
      yearMonth,
      showOutsideDays,
      focusedDate,
      today,
      isDateDisallowed,
      min,
      max,
      mode,
      currentSelection,
      tentativeStart,
      dayFormatter,
    ],
  );

  const handleDayClick = useCallback(
    (date: PlainDate, isDisallowed: boolean) => {
      if (!isDisallowed) {
        onSelectDay(date);
      }
      focusDay(date);
    },
    [onSelectDay, focusDay],
  );

  const handleDayMouseOver = useCallback(
    (date: PlainDate, isDisallowed: boolean, isDisabled: boolean) => {
      if (!isDisallowed && !isDisabled && onHoverDay) {
        onHoverDay(date);
      }
    },
    [onHoverDay],
  );

  return (
    <div className={styles.calendarMonth}>
      <div className={styles.heading}>
        {monthFormatter.format(toDate(yearMonth.toPlainDate()))}
      </div>

      <table className={styles.table}>
        <thead>
          <tr className={styles.headerRow}>
            {dayNames.map((dayName) => (
              <th key={dayName} className={styles.dayHeader} scope="col">
                <span className={styles.visuallyHidden}>{dayName}</span>
                <span aria-hidden="true">
                  {dayName.slice(0, formatWeekday === 'narrow' ? 1 : 2)}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr
              key={`week-${yearMonth.toString()}-${weekIndex}`}
              className={styles.weekRow}
            >
              {week.map((date) => {
                const dayProps = getDayProps(date);

                return (
                  <td key={`day-${date.toString()}`} className={styles.dayCell}>
                    {dayProps && (
                      <button
                        type="button"
                        className={`${styles.dayButton} ${
                          dayProps.isInMonth
                            ? dayProps.isSelected
                              ? styles.selected
                              : ''
                            : styles.outside
                        } ${dayProps.isDisallowed ? styles.disallowed : ''} ${
                          dayProps.isToday ? styles.today : ''
                        } ${dayProps.isRangeStart ? styles.rangeStart : ''} ${
                          dayProps.isRangeEnd ? styles.rangeEnd : ''
                        } ${dayProps.isRangeInner ? styles.rangeInner : ''}`}
                        tabIndex={
                          dayProps.isInMonth && dayProps.isFocusedDay ? 0 : -1
                        }
                        disabled={dayProps.isDisabled}
                        aria-disabled={
                          dayProps.isDisallowed ? 'true' : undefined
                        }
                        aria-pressed={
                          dayProps.isInMonth && dayProps.isSelected
                            ? 'true'
                            : undefined
                        }
                        aria-current={dayProps.isToday ? 'date' : undefined}
                        aria-label={dayProps.label}
                        onKeyDown={handleKeyDown}
                        onClick={() =>
                          handleDayClick(dayProps.date, dayProps.isDisallowed)
                        }
                        onMouseOver={() =>
                          handleDayMouseOver(
                            dayProps.date,
                            dayProps.isDisallowed,
                            dayProps.isDisabled,
                          )
                        }
                        onFocus={() =>
                          handleDayMouseOver(
                            dayProps.date,
                            dayProps.isDisallowed,
                            dayProps.isDisabled,
                          )
                        }
                      >
                        {date.day}
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
