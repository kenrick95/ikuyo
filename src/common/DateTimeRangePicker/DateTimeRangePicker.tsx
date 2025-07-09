import { DateTime } from 'luxon';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import 'cally';
import { getNavIcons } from '../navIcons';
import styles from './DateTimeRangePicker.module.css';

interface DateTimeRangeState {
  isCalendarOpen: boolean;
  tempStartDate: string;
  tempEndDate: string;
  tempStartTime: string;
  tempEndTime: string;
  validationError: string;
}

type DateTimeRangeAction =
  | { type: 'TOGGLE_CALENDAR' }
  | { type: 'OPEN_CALENDAR' }
  | { type: 'CLOSE_CALENDAR' }
  | { type: 'SET_TEMP_START_DATE'; payload: string }
  | { type: 'SET_TEMP_END_DATE'; payload: string }
  | { type: 'SET_TEMP_START_TIME'; payload: string }
  | { type: 'SET_TEMP_END_TIME'; payload: string }
  | { type: 'SET_VALIDATION_ERROR'; payload: string }
  | { type: 'CLEAR_START' }
  | { type: 'CLEAR_END' }
  | {
      type: 'INITIALIZE_TEMP_VALUES';
      payload: {
        startDate: string;
        endDate: string;
        startTime: string;
        endTime: string;
      };
    };

const initialState: DateTimeRangeState = {
  isCalendarOpen: false,
  tempStartDate: '',
  tempEndDate: '',
  tempStartTime: '',
  tempEndTime: '',
  validationError: '',
};

function dateTimeRangeReducer(
  state: DateTimeRangeState,
  action: DateTimeRangeAction,
): DateTimeRangeState {
  switch (action.type) {
    case 'TOGGLE_CALENDAR':
      return { ...state, isCalendarOpen: !state.isCalendarOpen };
    case 'OPEN_CALENDAR':
      return { ...state, isCalendarOpen: true };
    case 'CLOSE_CALENDAR':
      return { ...state, isCalendarOpen: false };
    case 'SET_TEMP_START_DATE':
      return { ...state, tempStartDate: action.payload };
    case 'SET_TEMP_END_DATE':
      return { ...state, tempEndDate: action.payload };
    case 'SET_TEMP_START_TIME':
      return { ...state, tempStartTime: action.payload };
    case 'SET_TEMP_END_TIME':
      return { ...state, tempEndTime: action.payload };
    case 'SET_VALIDATION_ERROR':
      return { ...state, validationError: action.payload };
    case 'CLEAR_START':
      return { ...state, tempStartDate: '', tempStartTime: '09:00' };
    case 'CLEAR_END':
      return { ...state, tempEndDate: '', tempEndTime: '17:00' };
    case 'INITIALIZE_TEMP_VALUES':
      return {
        ...state,
        tempStartDate: action.payload.startDate,
        tempEndDate: action.payload.endDate,
        tempStartTime: action.payload.startTime || '09:00',
        tempEndTime: action.payload.endTime || '17:00',
        validationError: '',
      };
    default:
      return state;
  }
}

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
  const [state, dispatch] = useReducer(dateTimeRangeReducer, initialState);

  const {
    isCalendarOpen,
    tempStartDate,
    tempEndDate,
    tempStartTime,
    tempEndTime,
    validationError,
  } = state;

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
      dispatch({
        type: 'INITIALIZE_TEMP_VALUES',
        payload: { startDate, endDate, startTime, endTime },
      });
    }
  }, [isCalendarOpen, startDate, endDate, startTime, endTime]);

  // Validate the current temp values
  const validateRange = useCallback(() => {
    if (!tempStartDate && !tempEndDate) {
      dispatch({ type: 'SET_VALIDATION_ERROR', payload: '' });
      return true;
    }

    if ((tempStartDate && !tempEndDate) || (!tempStartDate && tempEndDate)) {
      dispatch({
        type: 'SET_VALIDATION_ERROR',
        payload: 'Both start and end dates are required for a valid range',
      });
      return false;
    }

    if (tempStartDate && tempEndDate && tempStartTime && tempEndTime) {
      const startDT = DateTime.fromISO(`${tempStartDate}T${tempStartTime}`);
      const endDT = DateTime.fromISO(`${tempEndDate}T${tempEndTime}`);

      if (startDT.isValid && endDT.isValid && endDT <= startDT) {
        dispatch({
          type: 'SET_VALIDATION_ERROR',
          payload: 'End date and time must be after start date and time',
        });
        return false;
      }
    }

    dispatch({ type: 'SET_VALIDATION_ERROR', payload: '' });
    return true;
  }, [tempStartDate, tempEndDate, tempStartTime, tempEndTime]);

  // Validate whenever temp values change
  useEffect(() => {
    if (isCalendarOpen) {
      validateRange();
    }
  }, [isCalendarOpen, validateRange]);

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
        dispatch({ type: 'SET_TEMP_START_TIME', payload: time });
      } else {
        dispatch({ type: 'SET_TEMP_END_TIME', payload: time });
      }
    },
    [],
  );

  const clearRange = useCallback(() => {
    if (!onRangeChange || disabled) return;

    onRangeChange('', '');
    dispatch({ type: 'CLOSE_CALENDAR' });
    setTimeout(() => {
      buttonRef.current?.focus();
    }, 100);
  }, [onRangeChange, disabled]);

  const clearStart = useCallback(() => {
    dispatch({ type: 'CLEAR_START' });
  }, []);

  const clearEnd = useCallback(() => {
    dispatch({ type: 'CLEAR_END' });
  }, []);

  const applyChanges = useCallback(() => {
    if (!onRangeChange || disabled) {
      return;
    }

    // Handle clearing values
    if (!tempStartDate && !tempEndDate) {
      onRangeChange('', '');
      dispatch({ type: 'CLOSE_CALENDAR' });
      setTimeout(() => {
        buttonRef.current?.focus();
      }, 100);
      return;
    }

    // Validate before applying
    if (!validateRange()) {
      return;
    }

    if (tempStartDate && tempEndDate && tempStartTime && tempEndTime) {
      // Combine date and time to create ISO datetime strings
      const startDT = DateTime.fromISO(`${tempStartDate}T${tempStartTime}`);
      const endDT = DateTime.fromISO(`${tempEndDate}T${tempEndTime}`);

      if (startDT.isValid && endDT.isValid) {
        onRangeChange(startDT.toISO(), endDT.toISO());
        dispatch({ type: 'CLOSE_CALENDAR' });
        // Restore focus to the button when calendar closes
        setTimeout(() => {
          buttonRef.current?.focus();
        }, 100);
      }
    }
  }, [
    onRangeChange,
    disabled,
    tempStartDate,
    tempEndDate,
    tempStartTime,
    tempEndTime,
    validateRange,
  ]);

  const closeCalendar = useCallback(() => {
    dispatch({ type: 'CLOSE_CALENDAR' });
    // Restore focus to the button when calendar closes
    setTimeout(() => {
      buttonRef.current?.focus();
    }, 100);
  }, []);

  const handleToggleCalendar = useCallback(() => {
    if (!disabled) {
      dispatch({ type: 'TOGGLE_CALENDAR' });
    }
  }, [disabled]);

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
        dispatch({ type: 'SET_TEMP_START_DATE', payload: target.value });
      }
    };

    const handleEndDateChange = (event: Event) => {
      const target = event.target as HTMLElement & { value: string };
      if (target.value) {
        dispatch({ type: 'SET_TEMP_END_DATE', payload: target.value });
      }
    };

    startCalendar.addEventListener('change', handleStartDateChange);
    endCalendar.addEventListener('change', handleEndDateChange);

    // Create start date section
    const startSection = document.createElement('div');
    startSection.className = styles.dateTimeSection;

    const startHeader = document.createElement('div');
    startHeader.className = styles.sectionHeaderWrapper;

    const startTitle = document.createElement('h4');
    startTitle.className = styles.sectionHeader;
    startTitle.textContent = startLabel;

    const startClearButton = document.createElement('button');
    startClearButton.type = 'button';
    startClearButton.className = styles.clearSectionButton;
    startClearButton.textContent = 'Clear';
    startClearButton.setAttribute(
      'aria-label',
      `Clear ${startLabel.toLowerCase()} date and time`,
    );
    startClearButton.addEventListener('click', clearStart);

    startHeader.appendChild(startTitle);
    if (tempStartDate) {
      startHeader.appendChild(startClearButton);
    }

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

    const endHeader = document.createElement('div');
    endHeader.className = styles.sectionHeaderWrapper;

    const endTitle = document.createElement('h4');
    endTitle.className = styles.sectionHeader;
    endTitle.textContent = endLabel;

    const endClearButton = document.createElement('button');
    endClearButton.type = 'button';
    endClearButton.className = styles.clearSectionButton;
    endClearButton.textContent = 'Clear';
    endClearButton.setAttribute(
      'aria-label',
      `Clear ${endLabel.toLowerCase()} date and time`,
    );
    endClearButton.addEventListener('click', clearEnd);

    endHeader.appendChild(endTitle);
    if (tempEndDate) {
      endHeader.appendChild(endClearButton);
    }

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

    // Add validation error display
    if (validationError) {
      const errorDiv = document.createElement('div');
      errorDiv.className = styles.validationError;
      errorDiv.textContent = validationError;
      errorDiv.setAttribute('role', 'alert');
      actionsWrapper.appendChild(errorDiv);
    }

    const buttonGroup = document.createElement('div');
    buttonGroup.className = styles.buttonGroup;

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = styles.cancelButton;
    cancelButton.textContent = 'Cancel';
    cancelButton.setAttribute('aria-label', 'Cancel date and time selection');
    cancelButton.addEventListener('click', closeCalendar);

    const applyButton = document.createElement('button');
    applyButton.type = 'button';
    applyButton.className = `${styles.applyButton} ${validationError ? styles.disabled : ''}`;
    applyButton.textContent = 'Apply';
    applyButton.setAttribute('aria-label', 'Apply selected date and time');
    applyButton.disabled = !!validationError;
    applyButton.addEventListener('click', applyChanges);

    buttonGroup.appendChild(cancelButton);
    buttonGroup.appendChild(applyButton);
    actionsWrapper.appendChild(buttonGroup);

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
    clearStart,
    clearEnd,
    validationError,
  ]);

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.inputGroup}>
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
        {(startDateTime || endDateTime) && !disabled && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={clearRange}
            aria-label="Clear date and time range"
            title="Clear range"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <title>Clear range</title>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>
      {isCalendarOpen && (
        <div className={styles.calendarContainer}>
          <div ref={containerRef} />
        </div>
      )}
    </div>
  );
}
