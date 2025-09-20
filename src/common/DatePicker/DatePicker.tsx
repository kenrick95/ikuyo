import { DateTime } from 'luxon';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarMonth } from './CalendarMonth';
import styles from './DatePicker.module.css';
import type { PlainDate } from './temporal';
import { useDatePicker } from './useDatePicker';

export interface DatePickerProps {
  /** Selected date(s) - single date string for single mode, "start/end" for range mode */
  value?: string;
  /** Minimum selectable date */
  min?: string;
  /** Maximum selectable date */
  max?: string;
  /** Calendar mode - 'single' for single date, 'range' for date range */
  mode?: 'single' | 'range';
  /** Callback when date selection changes */
  onChange?: (value: string) => void;
  /** Custom class name */
  className?: string;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** First day of week (0 = Sunday, 1 = Monday) */
  firstDayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Function to determine if a date should be disabled */
  isDateDisallowed?: (date: Date) => boolean;
  /** Locale for date formatting */
  locale?: string;
  /** Format for weekday display */
  formatWeekday?: 'narrow' | 'short' | 'long';
  /** Whether to show dates from adjacent months */
  showOutsideDays?: boolean;
  /** Number of months to display */
  months?: number;
}

export function DatePicker({
  value = '',
  min,
  max,
  mode = 'single',
  onChange,
  className,
  disabled = false,
  placeholder,
  firstDayOfWeek = 1,
  isDateDisallowed,
  locale,
  formatWeekday = 'narrow',
  showOutsideDays = false,
  months = 1,
}: DatePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [focusedDate, setFocusedDate] = useState<PlainDate | undefined>();

  const datePicker = useDatePicker({
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
  });

  // Format dates for display using Luxon
  const formattedDisplay = useMemo(() => {
    if (mode === 'single') {
      if (!value) {
        return placeholder || 'Select date';
      }
      const date = DateTime.fromISO(value);
      if (!date.isValid) {
        return 'Invalid date';
      }
      return date.toFormat('d LLLL yyyy');
    } else {
      // Range mode
      if (!value || !value.includes('/')) {
        return placeholder || 'Select date range';
      }
      const [startDate, endDate] = value.split('/');
      if (!startDate || !endDate) {
        return placeholder || 'Select date range';
      }

      const start = DateTime.fromISO(startDate);
      const end = DateTime.fromISO(endDate);

      if (!start.isValid || !end.isValid) {
        return 'Invalid date range';
      }

      // If start and end are the same, show "15 July 2024"
      if (start.equals(end)) {
        return start.toFormat('d LLLL yyyy');
      }
      // If same month and year, show "15 – 20 July 2024"
      else if (start.year === end.year && start.month === end.month) {
        return `${start.toFormat('d')}–${end.toFormat('d LLLL yyyy')}`;
      }
      // If same year, show "15 July – 20 August 2024"
      else if (start.year === end.year) {
        return `${start.toFormat('d LLLL')}–${end.toFormat('d LLLL yyyy')}`;
      }
      // Different years, show "30 December 2024 – 5 January 2025"
      else {
        return `${start.toFormat('d LLLL yyyy')}–${end.toFormat('d LLLL yyyy')}`;
      }
    }
  }, [value, mode, placeholder]);

  const handleDateSelect = useCallback(
    (selectedDate: PlainDate) => {
      if (!onChange || disabled) return;

      if (mode === 'single') {
        onChange(selectedDate.toString());
        // Close calendar after selection and restore focus
        setIsCalendarOpen(false);
        setTimeout(() => {
          buttonRef.current?.focus();
        }, 100);
      } else {
        // Range mode - handled by useDatePicker
        const newValue = datePicker.handleRangeSelect(selectedDate);
        if (newValue !== undefined) {
          onChange(newValue);
          if (newValue.includes('/')) {
            // Complete range selected, close calendar
            setIsCalendarOpen(false);
            setTimeout(() => {
              buttonRef.current?.focus();
            }, 100);
          }
        }
      }
    },
    [onChange, disabled, mode, datePicker],
  );

  const closeCalendar = useCallback(() => {
    setIsCalendarOpen(false);
    // Restore focus to the button when calendar closes
    setTimeout(() => {
      buttonRef.current?.focus();
    }, 100);
  }, []);

  const handleToggleCalendar = useCallback(() => {
    if (!disabled) {
      setIsCalendarOpen(!isCalendarOpen);
    }
  }, [disabled, isCalendarOpen]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleToggleCalendar();
      } else if (event.key === 'Escape') {
        closeCalendar();
      }
    },
    [handleToggleCalendar, closeCalendar],
  );

  // Close calendar when clicking outside or pressing ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeCalendar();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCalendar();
      }
    };

    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isCalendarOpen, closeCalendar]);

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.selectedDates} ${disabled ? styles.disabled : ''}`}
        onClick={handleToggleCalendar}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-expanded={isCalendarOpen}
        aria-haspopup="dialog"
        aria-label={mode === 'single' ? 'Select date' : 'Select date range'}
      >
        {formattedDisplay}
        <svg
          className={`${styles.chevron} ${isCalendarOpen ? styles.chevronUp : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <title>{isCalendarOpen ? 'Close calendar' : 'Open calendar'}</title>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {isCalendarOpen && (
        <div className={styles.calendarContainer}>
          <div ref={containerRef} className={styles.calendarWrapper}>
            <div className={styles.calendarHeader}>
              <button
                type="button"
                className={styles.navButton}
                onClick={datePicker.previous}
                disabled={!datePicker.previous}
                aria-label="Previous month"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.navIcon}
                >
                  <title>Previous month</title>
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>

              <div className={styles.headerText}>{datePicker.headerText}</div>

              <button
                type="button"
                className={styles.navButton}
                onClick={datePicker.next}
                disabled={!datePicker.next}
                aria-label="Next month"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.navIcon}
                >
                  <title>Next month</title>
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>

            <div className={styles.monthsContainer}>
              {Array.from({ length: months }, (_, i) => (
                <CalendarMonth
                  key={`month-${datePicker.page.start.toString()}-${i}`}
                  offset={i}
                  {...datePicker}
                  onSelectDay={handleDateSelect}
                  onFocusDay={setFocusedDate}
                  onHoverDay={datePicker.onHoverDay}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
