import clsx from 'clsx';
import type { DateTime } from 'luxon';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import s from './TimeDropdown.module.css';

interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
  durationLabel?: string;
  key: string;
  disabled?: boolean;
}

export interface TimeDropdownProps {
  hour: number | undefined;
  minute: number | undefined;
  onChange: (hour: number, minute: number) => void;
  /** If provided, each time slot shows duration relative to this reference (for end-time pickers) */
  referenceDateTime?: DateTime;
  /** The date of the current time slot (needed for multi-day duration calc) */
  currentDate?: DateTime;
  /** Minimum time allowed — slots before this are hidden (for end-time after start-time) */
  minHour?: number;
  minMinute?: number;
  /** Whether start and end are on the same day (controls filtering) */
  isSameDay?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
}

function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return hours === 1 ? '1 hr' : `${hours} hrs`;
  return hours === 1 ? `1 hr ${mins} min` : `${hours} hrs ${mins} min`;
}

/** Parse a typed time string like "9:30", "14:5", "930", "9" into [hour, minute] or null */
function parseTimeInput(input: string): [number, number] | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Match HH:MM or H:MM or H:M
  const colonMatch = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);
  if (colonMatch) {
    const h = Number(colonMatch[1]);
    const m = Number(colonMatch[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return [h, m];
    }
    return null;
  }

  // Match plain digits: 1-4 digits
  const digitMatch = trimmed.match(/^(\d{1,4})$/);
  if (digitMatch) {
    const digits = digitMatch[1];
    if (digits.length <= 2) {
      // Interpret as hour only
      const h = Number(digits);
      if (h >= 0 && h <= 23) return [h, 0];
    } else if (digits.length === 3) {
      // e.g. "930" -> 9:30
      const h = Number(digits[0]);
      const m = Number(digits.slice(1));
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return [h, m];
    } else if (digits.length === 4) {
      // e.g. "0930" -> 09:30
      const h = Number(digits.slice(0, 2));
      const m = Number(digits.slice(2));
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return [h, m];
    }
  }

  return null;
}

function TimeDropdownInner({
  hour,
  minute,
  onChange,
  referenceDateTime,
  currentDate,
  minHour,
  minMinute,
  isSameDay,
  disabled,
  'aria-label': ariaLabel,
}: TimeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isClickingItemRef = useRef(false);
  const pendingFocusIndexRef = useRef<number | null>(null);

  const timeSlots: TimeSlot[] = useMemo(() => {
    const slots: TimeSlot[] = [];
    const hasMin =
      isSameDay && minHour !== undefined && minMinute !== undefined;
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 5) {
        // Filter: hide slots at or before the min time when on same day
        if (hasMin) {
          const slotTotal = h * 60 + m;
          const minTotal = minHour * 60 + minMinute;
          if (slotTotal <= minTotal) continue;
        }

        const label = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        let durationLabel: string | undefined;
        if (referenceDateTime) {
          const slotDate = currentDate ?? referenceDateTime;
          const slotDt = slotDate.set({
            hour: h,
            minute: m,
            second: 0,
            millisecond: 0,
          });
          const diffMinutes = slotDt.diff(referenceDateTime, 'minutes').minutes;
          if (diffMinutes > 0) {
            durationLabel = formatDuration(Math.round(diffMinutes));
          }
        }
        slots.push({ hour: h, minute: m, label, durationLabel, key: label });
      }
    }
    return slots;
  }, [referenceDateTime, currentDate, minHour, minMinute, isSameDay]);

  const selectedKey =
    hour !== undefined && minute !== undefined
      ? `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      : undefined;

  const displayText =
    hour !== undefined && minute !== undefined
      ? `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      : '';

  // Scroll selected item into view when opening, and handle pending focus
  useLayoutEffect(() => {
    if (!isOpen || !listRef.current) return;
    requestAnimationFrame(() => {
      // Handle pending focus from keyboard navigation
      const pendingIdx = pendingFocusIndexRef.current;
      if (pendingIdx !== null) {
        pendingFocusIndexRef.current = null;
        const btn = listRef.current?.querySelector(
          `button[data-index="${pendingIdx}"]`,
        ) as HTMLButtonElement | null;
        if (btn) {
          btn.scrollIntoView({ block: 'center' });
          btn.focus();
          return;
        }
      }
      // Otherwise scroll to selected, or to first slot
      const target = selectedKey
        ? listRef.current?.querySelector(`button[data-key="${selectedKey}"]`)
        : listRef.current?.querySelector('button[data-key]');
      if (target) {
        target.scrollIntoView({ block: 'center' });
      }
    });
  }, [isOpen, selectedKey]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const h = Number(e.currentTarget.dataset.hour);
      const m = Number(e.currentTarget.dataset.minute);
      onChange(h, m);
      setIsOpen(false);
      setIsEditing(false);
      setInputValue('');
      isClickingItemRef.current = false;
    },
    [onChange],
  );

  const handleItemMouseDown = useCallback(() => {
    // Prevent blur from firing before click completes
    isClickingItemRef.current = true;
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const index = Number(e.currentTarget.dataset.index);
      let nextIndex = index;
      switch (e.key) {
        case 'ArrowUp':
          nextIndex = Math.max(0, index - 1);
          break;
        case 'ArrowDown':
          nextIndex = Math.min(timeSlots.length - 1, index + 1);
          break;
        case 'PageUp':
          nextIndex = Math.max(0, index - 12);
          break;
        case 'PageDown':
          nextIndex = Math.min(timeSlots.length - 1, index + 12);
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = timeSlots.length - 1;
          break;
        case 'Enter': {
          e.preventDefault();
          const h = Number(e.currentTarget.dataset.hour);
          const m = Number(e.currentTarget.dataset.minute);
          onChange(h, m);
          setIsOpen(false);
          setIsEditing(false);
          setInputValue('');
          inputRef.current?.focus();
          return;
        }
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setIsEditing(false);
          setInputValue('');
          inputRef.current?.focus();
          return;
        default:
          return;
      }
      e.preventDefault();
      requestAnimationFrame(() => {
        const btn = listRef.current?.querySelector(
          `button[data-index="${nextIndex}"]`,
        ) as HTMLButtonElement | null;
        btn?.focus();
      });
    },
    [timeSlots.length, onChange],
  );

  // --- Text input handlers ---
  const handleInputFocus = useCallback(() => {
    setIsEditing(true);
    setInputValue(displayText);
    setIsOpen(true);
  }, [displayText]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    },
    [],
  );

  const handleInputBlur = useCallback(() => {
    // No-op: actual close logic is in handleWrapperBlur
    // We keep this to reset isClickingItemRef for mouse interactions
    if (isClickingItemRef.current) {
      return;
    }
  }, []);

  // Handles focus leaving the entire component (input or dropdown items)
  const handleWrapperBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      // If focus is moving to another element inside the wrapper, do nothing
      if (
        e.relatedTarget &&
        e.currentTarget.contains(e.relatedTarget as Node)
      ) {
        return;
      }
      // If a mouse click is in progress on a dropdown item, let the click handler deal with it
      if (isClickingItemRef.current) {
        return;
      }
      // Focus left the component entirely — commit and close
      setIsEditing(false);
      setIsOpen(false);
      if (inputValue) {
        const parsed = parseTimeInput(inputValue);
        if (parsed) {
          onChange(parsed[0], parsed[1]);
        }
      }
      setInputValue('');
    },
    [inputValue, onChange],
  );
  const focusListItem = useCallback((index: number) => {
    requestAnimationFrame(() => {
      const btn = listRef.current?.querySelector(
        `button[data-index="${index}"]`,
      ) as HTMLButtonElement | null;
      btn?.focus();
    });
  }, []);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const parsed = parseTimeInput(inputValue);
        if (parsed) {
          onChange(parsed[0], parsed[1]);
          setIsOpen(false);
          setIsEditing(false);
          setInputValue('');
          inputRef.current?.blur();
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setIsEditing(false);
        setInputValue('');
        inputRef.current?.blur();
      } else if (e.key === 'Tab') {
        // Close dropdown synchronously so the DOM buttons are removed
        // before the browser resolves the next Tab target
        if (isOpen) {
          const parsed = parseTimeInput(inputValue);
          flushSync(() => {
            setIsOpen(false);
            setIsEditing(false);
            setInputValue('');
          });
          if (parsed) {
            onChange(parsed[0], parsed[1]);
          }
        }
        // Don't preventDefault — let native Tab advance focus
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const idx = selectedKey
          ? timeSlots.findIndex((sl) => sl.key === selectedKey)
          : 0;
        const targetIdx = idx >= 0 ? idx : 0;
        if (isOpen) {
          focusListItem(targetIdx);
        } else {
          // Dropdown not yet rendered — store pending focus and open
          pendingFocusIndexRef.current = targetIdx;
          setIsOpen(true);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const idx = selectedKey
          ? timeSlots.findIndex((sl) => sl.key === selectedKey)
          : timeSlots.length - 1;
        const targetIdx = idx >= 0 ? idx : timeSlots.length - 1;
        if (isOpen) {
          focusListItem(targetIdx);
        } else {
          pendingFocusIndexRef.current = targetIdx;
          setIsOpen(true);
        }
      }
    },
    [inputValue, onChange, isOpen, selectedKey, timeSlots, focusListItem],
  );

  // Close dropdown on outside click
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsEditing(false);
        setInputValue('');
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: onBlur on wrapper detects focus leaving the composite widget
    <div className={s.wrapper} ref={wrapperRef} onBlur={handleWrapperBlur}>
      <input
        ref={inputRef}
        type="text"
        className={s.trigger}
        disabled={disabled}
        aria-label={ariaLabel ?? 'Select time'}
        value={isEditing ? inputValue : displayText}
        placeholder="--:--"
        onFocus={handleInputFocus}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        autoComplete="off"
      />
      {isOpen && (
        <div className={s.dropdown}>
          <div
            className={s.timeList}
            ref={listRef}
            role="listbox"
            aria-label={ariaLabel ?? 'Select time'}
          >
            {timeSlots.map((slot, i) => {
              const isSelected = selectedKey === slot.key;
              return (
                <button
                  type="button"
                  key={slot.key}
                  className={clsx(s.item, { [s.selected]: isSelected })}
                  data-key={slot.key}
                  data-hour={slot.hour}
                  data-minute={slot.minute}
                  data-index={i}
                  onMouseDown={handleItemMouseDown}
                  onClick={handleClick}
                  onKeyDown={handleKeyDown}
                  tabIndex={isSelected ? 0 : -1}
                  role="option"
                  aria-selected={isSelected}
                  aria-label={
                    slot.durationLabel
                      ? `${slot.label} (${slot.durationLabel})`
                      : slot.label
                  }
                >
                  <span className={s.timeLabel}>{slot.label}</span>
                  {slot.durationLabel && (
                    <span className={s.durationLabel}>
                      ({slot.durationLabel})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export const TimeDropdown = memo(TimeDropdownInner);
