import { DateTime } from 'luxon';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'cally';
import styles from './DateRangePicker.module.css';

export interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  min?: string;
  max?: string;
  onRangeChange?: (startDate: string, endDate: string) => void;
  className?: string;
  disabled?: boolean;
}

export function DateRangePicker({
  startDate,
  endDate,
  min,
  max,
  onRangeChange,
  className,
  disabled = false,
}: DateRangePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Convert start and end dates to range format for cally
  const rangeValue = startDate && endDate ? `${startDate}/${endDate}` : '';

  // Format dates for display using Luxon
  const formattedDateRange = useMemo(() => {
    if (!startDate || !endDate) {
      return 'Select date range';
    }

    const start = DateTime.fromISO(startDate);
    const end = DateTime.fromISO(endDate);

    if (!start.isValid || !end.isValid) {
      return 'Invalid date range';
    }

    // If same month and year, show "15 – 20 July 2024"
    if (start.year === end.year && start.month === end.month) {
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
  }, [startDate, endDate]);

  const handleChange = useCallback(
    (event: Event) => {
      if (!onRangeChange || disabled) return;

      const target = event.target as HTMLElement & { value: string };
      const value = target.value;

      if (value?.includes('/')) {
        const [start, end] = value.split('/');
        if (start && end) {
          onRangeChange(start, end);
          // Close calendar after selection and restore focus
          setIsCalendarOpen(false);
          // Use setTimeout to ensure the calendar is closed before focusing
          setTimeout(() => {
            buttonRef.current?.focus();
          }, 100);
        }
      }
    },
    [onRangeChange, disabled],
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isCalendarOpen) return;

    // Create the cally components using DOM API to avoid TypeScript issues
    const calendarRange = document.createElement('calendar-range');
    calendarRange.setAttribute('value', rangeValue);
    if (min) calendarRange.setAttribute('min', min);
    if (max) calendarRange.setAttribute('max', max);
    calendarRange.setAttribute('first-day-of-week', '1');
    calendarRange.setAttribute('show-outside-days', 'false');
    calendarRange.setAttribute('months', '1');
    calendarRange.setAttribute('page-by', 'months');
    calendarRange.setAttribute('format-weekday', 'short');
    calendarRange.className = `${styles.calendarRange} ${disabled ? styles.disabled : ''}`;

    // Make the calendar range focusable and handle keyboard navigation
    calendarRange.setAttribute('tabindex', '0');
    calendarRange.setAttribute('role', 'dialog');
    calendarRange.setAttribute('aria-label', 'Date range picker');

    // Handle keyboard navigation within the calendar
    const handleCalendarKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCalendar();
      }
      // Allow normal tab navigation within the calendar
      // The cally component handles arrow key navigation internally
    };

    calendarRange.addEventListener('keydown', handleCalendarKeyDown);
    // Create navigation icons
    const prevIcon = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    );
    prevIcon.setAttribute('slot', 'previous');
    prevIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    prevIcon.setAttribute('viewBox', '0 0 24 24');
    prevIcon.setAttribute('fill', 'none');
    prevIcon.setAttribute('stroke', 'currentColor');
    prevIcon.setAttribute('stroke-width', '2');
    prevIcon.setAttribute('stroke-linecap', 'round');
    prevIcon.setAttribute('stroke-linejoin', 'round');
    prevIcon.setAttribute('aria-label', 'Previous month');
    prevIcon.setAttribute('class', styles.navIcon);

    const prevTitle = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'title',
    );
    prevTitle.textContent = 'Previous month';
    prevIcon.appendChild(prevTitle);

    const prevPath = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path',
    );
    prevPath.setAttribute('d', 'm15 18-6-6 6-6');
    prevIcon.appendChild(prevPath);

    const nextIcon = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    );
    nextIcon.setAttribute('slot', 'next');
    nextIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    nextIcon.setAttribute('viewBox', '0 0 24 24');
    nextIcon.setAttribute('fill', 'none');
    nextIcon.setAttribute('stroke', 'currentColor');
    nextIcon.setAttribute('stroke-width', '2');
    nextIcon.setAttribute('stroke-linecap', 'round');
    nextIcon.setAttribute('stroke-linejoin', 'round');
    nextIcon.setAttribute('aria-label', 'Next month');
    nextIcon.setAttribute('class', styles.navIcon);

    const nextTitle = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'title',
    );
    nextTitle.textContent = 'Next month';
    nextIcon.appendChild(nextTitle);

    const nextPath = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path',
    );
    nextPath.setAttribute('d', 'm9 18 6-6-6-6');
    nextIcon.appendChild(nextPath);

    // Create calendar month
    const calendarMonth = document.createElement('calendar-month');

    calendarMonth.classList.add(styles.calendarMonth);

    // Append all elements
    calendarRange.appendChild(prevIcon);
    calendarRange.appendChild(nextIcon);
    calendarRange.appendChild(calendarMonth);

    // Add event listener
    calendarRange.addEventListener('change', handleChange);

    // Append to container
    container.appendChild(calendarRange);

    // Focus the first focusable element in the calendar after it's rendered
    // Use a timeout to ensure the calendar is fully rendered
    setTimeout(() => {
      const firstFocusableElement = calendarRange.querySelector(
        'button, [tabindex]:not([tabindex="-1"])',
      ) as HTMLElement;
      if (firstFocusableElement) {
        firstFocusableElement.focus();
      } else {
        // Fallback to focusing the calendar range itself
        calendarRange.focus();
      }
    }, 50);

    return () => {
      calendarRange.removeEventListener('keydown', handleCalendarKeyDown);
      calendarRange.removeEventListener('change', handleChange);
      if (container.contains(calendarRange)) {
        container.removeChild(calendarRange);
      }
    };
  }, [
    rangeValue,
    min,
    max,
    disabled,
    handleChange,
    isCalendarOpen,
    closeCalendar,
  ]);

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
        aria-label="Select date range"
      >
        {formattedDateRange}
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
          <div ref={containerRef} />
        </div>
      )}
    </div>
  );
}
