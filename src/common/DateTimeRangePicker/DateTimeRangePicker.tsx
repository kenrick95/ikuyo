import { DateTime } from 'luxon';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'cally';
import { getNavIcons } from '../navIcons';
import styles from './DateTimeRangePicker.module.css';

export interface DateTimeRangePickerProps {
  startDateTime?: string;
  endDateTime?: string;
  min?: string;
  max?: string;
  onRangeChange?: (startDateTime: string, endDateTime: string) => void;
  className?: string;
  disabled?: boolean;
  timeZone?: string;
  startLabel?: string;
  endLabel?: string;
}

export function DateTimeRangePicker({
  startDateTime,
  endDateTime,
  min,
  max,
  onRangeChange,
  className,
  disabled = false,
  startLabel = 'Start',
  endLabel = 'End',
}: DateTimeRangePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');
  const [tempStartTime, setTempStartTime] = useState<string>('');
  const [tempEndTime, setTempEndTime] = useState<string>('');

  // Parse existing datetime values
  const { startDate, startTime, endDate, endTime } = useMemo(() => {
    const startDT = startDateTime ? DateTime.fromISO(startDateTime) : null;
    const endDT = endDateTime ? DateTime.fromISO(endDateTime) : null;

    return {
      startDate: startDT?.isValid ? startDT.toISODate() : '',
      startTime: startDT?.isValid ? startDT.toFormat('HH:mm') : '',
      endDate: endDT?.isValid ? endDT.toISODate() : '',
      endTime: endDT?.isValid ? endDT.toFormat('HH:mm') : '',
    };
  }, [startDateTime, endDateTime]);

  // Initialize temp values when calendar opens
  useEffect(() => {
    if (isCalendarOpen) {
      setTempStartDate(startDate);
      setTempEndDate(endDate);
      setTempStartTime(startTime || '09:00');
      setTempEndTime(endTime || '17:00');
    }
  }, [isCalendarOpen, startDate, endDate, startTime, endTime]);

  // Format date range for display
  const formattedDateRange = useMemo(() => {
    if (!startDateTime || !endDateTime) {
      return 'Select date and time range';
    }

    const start = DateTime.fromISO(startDateTime);
    const end = DateTime.fromISO(endDateTime);

    if (!start.isValid || !end.isValid) {
      return 'Invalid date range';
    }

    // If start and end are the same day, show "15 July 2024, 09:00 – 17:00"
    if (start.toISODate() === end.toISODate()) {
      return `${start.toFormat('d LLLL yyyy')}, ${start.toFormat('HH:mm')}–${end.toFormat('HH:mm')}`;
    }
    // Different days, show full date and time for both
    return `${start.toFormat('d LLL yyyy, HH:mm')}–${end.toFormat('d LLL yyyy, HH:mm')}`;
  }, [startDateTime, endDateTime]);

  const handleTimeChange = useCallback(
    (type: 'start' | 'end', time: string) => {
      if (type === 'start') {
        setTempStartTime(time);
      } else {
        setTempEndTime(time);
      }
    },
    [],
  );

  const applyChanges = useCallback(() => {
    if (
      !onRangeChange ||
      disabled ||
      !tempStartDate ||
      !tempEndDate ||
      !tempStartTime ||
      !tempEndTime
    ) {
      return;
    }

    // Combine date and time to create ISO datetime strings
    const startDT = DateTime.fromISO(`${tempStartDate}T${tempStartTime}`);
    const endDT = DateTime.fromISO(`${tempEndDate}T${tempEndTime}`);

    if (startDT.isValid && endDT.isValid) {
      onRangeChange(startDT.toISO(), endDT.toISO());
      setIsCalendarOpen(false);
      // Restore focus to the button when calendar closes
      setTimeout(() => {
        buttonRef.current?.focus();
      }, 100);
    }
  }, [
    onRangeChange,
    disabled,
    tempStartDate,
    tempEndDate,
    tempStartTime,
    tempEndTime,
  ]);

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
        !containerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
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

  // Set up cally calendar components
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isCalendarOpen) return;

    const calendarWrapper = document.createElement('div');
    calendarWrapper.classList.add(styles.calendarWrapper);

    // Make the calendar wrapper a focus trap
    calendarWrapper.setAttribute('role', 'dialog');
    calendarWrapper.setAttribute('aria-modal', 'true');
    calendarWrapper.setAttribute('aria-label', 'Date and time range picker');
    // Make it focusable so it can be a fallback focus target
    calendarWrapper.setAttribute('tabindex', '-1');

    // Create the left calendar (start date)
    const startCalendar = document.createElement('calendar-date');
    startCalendar.setAttribute('value', tempStartDate);
    if (min) {
      const minDate = DateTime.fromISO(min);
      if (minDate.isValid) {
        startCalendar.setAttribute('min', minDate.toISODate());
      }
    }
    if (max) {
      const maxDate = DateTime.fromISO(max);
      if (maxDate.isValid) {
        startCalendar.setAttribute('max', maxDate.toISODate());
      }
    }
    startCalendar.classList.add(styles.calendarDate);

    // Create calendar-month inside calendar-date for start
    const startCalendarMonth = document.createElement('calendar-month');
    startCalendarMonth.setAttribute('first-day-of-week', '1');
    startCalendarMonth.setAttribute('show-outside-days', 'false');
    startCalendarMonth.setAttribute('format-weekday', 'short');
    startCalendarMonth.classList.add(styles.calendarMonth);

    const { prevIcon: prevIconStart, nextIcon: nextIconStart } = getNavIcons({
      styles: {
        navIcon: styles.navIcon,
      },
    });

    startCalendar.appendChild(prevIconStart);
    startCalendar.appendChild(nextIconStart);
    startCalendar.appendChild(startCalendarMonth);

    // Create the right calendar (end date)
    const endCalendar = document.createElement('calendar-date');
    endCalendar.setAttribute('value', tempEndDate);
    endCalendar.classList.add(styles.calendarDate);
    if (min) {
      const minDate = DateTime.fromISO(min);
      if (minDate.isValid) {
        endCalendar.setAttribute('min', minDate.toISODate());
      }
    }
    if (max) {
      const maxDate = DateTime.fromISO(max);
      if (maxDate.isValid) {
        endCalendar.setAttribute('max', maxDate.toISODate());
      }
    }

    // Create calendar-month inside calendar-date for end
    const endCalendarMonth = document.createElement('calendar-month');
    endCalendarMonth.setAttribute('first-day-of-week', '1');
    endCalendarMonth.setAttribute('show-outside-days', 'false');
    endCalendarMonth.setAttribute('format-weekday', 'short');
    endCalendarMonth.classList.add(styles.calendarMonth);

    const { prevIcon: prevIconEnd, nextIcon: nextIconEnd } = getNavIcons({
      styles: {
        navIcon: styles.navIcon,
      },
    });

    endCalendar.appendChild(prevIconEnd);
    endCalendar.appendChild(nextIconEnd);
    endCalendar.appendChild(endCalendarMonth);

    // Handle calendar date selection
    const handleStartDateChange = (event: Event) => {
      const target = event.target as HTMLElement & { value: string };
      if (target.value) {
        setTempStartDate(target.value);
      }
    };

    const handleEndDateChange = (event: Event) => {
      const target = event.target as HTMLElement & { value: string };
      if (target.value) {
        setTempEndDate(target.value);
      }
    };

    startCalendar.addEventListener('change', handleStartDateChange);
    endCalendar.addEventListener('change', handleEndDateChange);

    // Create start date section
    const startSection = document.createElement('div');
    startSection.className = styles.dateTimeSection;

    const startHeader = document.createElement('h4');
    startHeader.className = styles.sectionHeader;
    startHeader.textContent = startLabel;

    const startTimeWrapper = document.createElement('div');
    startTimeWrapper.className = styles.timeInputWrapper;

    const startTimeInput = document.createElement('input');
    startTimeInput.type = 'time';
    startTimeInput.value = tempStartTime;
    startTimeInput.className = styles.timeInput;
    startTimeInput.setAttribute('aria-label', `${startLabel} time`);
    startTimeInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      handleTimeChange('start', target.value);
    });

    startTimeWrapper.appendChild(startTimeInput);
    startSection.appendChild(startHeader);
    startSection.appendChild(startCalendar);
    startSection.appendChild(startTimeWrapper);

    // Create end date section
    const endSection = document.createElement('div');
    endSection.className = styles.dateTimeSection;

    const endHeader = document.createElement('h4');
    endHeader.className = styles.sectionHeader;
    endHeader.textContent = endLabel;

    const endTimeWrapper = document.createElement('div');
    endTimeWrapper.className = styles.timeInputWrapper;

    const endTimeInput = document.createElement('input');
    endTimeInput.type = 'time';
    endTimeInput.value = tempEndTime;
    endTimeInput.className = styles.timeInput;
    endTimeInput.setAttribute('aria-label', `${endLabel} time`);
    endTimeInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      handleTimeChange('end', target.value);
    });

    endTimeWrapper.appendChild(endTimeInput);
    endSection.appendChild(endHeader);
    endSection.appendChild(endCalendar);
    endSection.appendChild(endTimeWrapper);

    // Create action buttons
    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = styles.actions;

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = styles.cancelButton;
    cancelButton.textContent = 'Cancel';
    cancelButton.setAttribute('aria-label', 'Cancel date and time selection');
    cancelButton.addEventListener('click', closeCalendar);

    const applyButton = document.createElement('button');
    applyButton.type = 'button';
    applyButton.className = styles.applyButton;
    applyButton.textContent = 'Apply';
    applyButton.setAttribute('aria-label', 'Apply selected date and time');
    applyButton.addEventListener('click', applyChanges);

    actionsWrapper.appendChild(cancelButton);
    actionsWrapper.appendChild(applyButton);

    // Assemble the calendar
    calendarWrapper.appendChild(startSection);
    calendarWrapper.appendChild(endSection);
    calendarWrapper.appendChild(actionsWrapper);

    container.appendChild(calendarWrapper);

    return () => {
      startCalendar.removeEventListener('change', handleStartDateChange);
      endCalendar.removeEventListener('change', handleEndDateChange);
      if (container.contains(calendarWrapper)) {
        container.removeChild(calendarWrapper);
      }
    };
  }, [
    isCalendarOpen,
    tempStartDate,
    tempEndDate,
    tempStartTime,
    tempEndTime,
    min,
    max,
    startLabel,
    endLabel,
    handleTimeChange,
    applyChanges,
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
        aria-label="Select date and time range"
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
