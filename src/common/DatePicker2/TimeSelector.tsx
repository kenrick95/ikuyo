import { Flex } from '@radix-ui/themes';
import clsx from 'clsx';
import {
  type FocusEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import s from './TimeSelector.module.css';
export interface TimeSelectorProps {
  disabled?: boolean;
  className?: string;
  onSelectHour: (hour: number) => void;
  onSelectMinute: (minute: number) => void;
  onFocusHour?: (hour: number) => void;
  onFocusMinute?: (minute: number) => void;
  focusedHour?: number;
  focusedMinute?: number;
  selectedHour?: number;
  selectedMinute?: number;
}

export function TimeSelector({
  disabled,
  className,
  onSelectHour,
  onSelectMinute,
  onFocusHour,
  onFocusMinute,
  focusedHour,
  focusedMinute,
  selectedHour,
  selectedMinute,
}: TimeSelectorProps) {
  const hours = useMemo(() => {
    return Array.from({ length: 24 })
      .fill(null)
      .map((_, i) => i);
  }, []);
  const minutes = useMemo(() => {
    return Array.from({ length: 12 })
      .fill(null)
      .map((_, i) => i * 5);
  }, []);

  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);
  const [isHourItemFocused, setIsHourItemFocused] = useState(false);
  const [isMinuteItemFocused, setIsMinuteItemFocused] = useState(false);

  // State for handling typed input
  const [typedHour, setTypedHour] = useState('');
  const [typedMinute, setTypedMinute] = useState('');
  const typedHourTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const typedMinuteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Clear typed input after delay
  const clearTypedHour = useCallback(() => {
    setTypedHour('');
    if (typedHourTimeoutRef.current) {
      clearTimeout(typedHourTimeoutRef.current);
      typedHourTimeoutRef.current = null;
    }
  }, []);

  const clearTypedMinute = useCallback(() => {
    setTypedMinute('');
    if (typedMinuteTimeoutRef.current) {
      clearTimeout(typedMinuteTimeoutRef.current);
      typedMinuteTimeoutRef.current = null;
    }
  }, []);

  const handleFocusHour = useCallback(
    (event: FocusEvent<HTMLButtonElement>) => {
      if (disabled) return;
      const hour = Number(event?.currentTarget?.dataset?.hour);
      setIsHourItemFocused(true);
      onFocusHour?.(hour);
    },
    [onFocusHour, disabled],
  );
  const handleFocusMinute = useCallback(
    (event: FocusEvent<HTMLButtonElement>) => {
      if (disabled) return;
      const minute = Number(event?.currentTarget?.dataset?.minute);
      setIsMinuteItemFocused(true);
      onFocusMinute?.(minute);
    },
    [onFocusMinute, disabled],
  );

  const handleClickHour = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      const hour = Number(event?.currentTarget?.dataset?.hour);
      onSelectHour?.(hour);
    },
    [disabled, onSelectHour],
  );
  const handleClickMinute = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      const minute = Number(event?.currentTarget?.dataset?.minute);
      onSelectMinute?.(minute);
    },
    [disabled, onSelectMinute],
  );
  const handleBlurHour = useCallback(() => {
    setIsHourItemFocused(false);
  }, []);
  const handleBlurMinute = useCallback(() => {
    setIsMinuteItemFocused(false);
  }, []);

  useLayoutEffect(() => {
    if (isHourItemFocused && focusedHour !== undefined) {
      const hourItem = hourListRef.current?.querySelector(
        `button[data-hour="${focusedHour}"]`,
      );
      if (hourItem) {
        (hourItem as HTMLButtonElement).focus();
      }
    } else if (isMinuteItemFocused && focusedMinute !== undefined) {
      const minuteItem = minuteListRef.current?.querySelector(
        `button[data-minute="${focusedMinute}"]`,
      );
      if (minuteItem) {
        (minuteItem as HTMLButtonElement).focus();
      }
    }
  }, [focusedHour, focusedMinute, isHourItemFocused, isMinuteItemFocused]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (typedHourTimeoutRef.current) {
        clearTimeout(typedHourTimeoutRef.current);
      }
      if (typedMinuteTimeoutRef.current) {
        clearTimeout(typedMinuteTimeoutRef.current);
      }
    };
  }, []);

  const handleKeyDownHour = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      let hour = Number(e?.currentTarget?.dataset?.hour);

      // Handle numeric input for jumping to hour
      if (/^[0-9]$/.test(e.key)) {
        const newTypedHour = typedHour + e.key;
        const numericValue = Number(newTypedHour);

        // Clear existing timeout
        if (typedHourTimeoutRef.current) {
          clearTimeout(typedHourTimeoutRef.current);
        }

        // Handle typed input based on length and validity
        if (newTypedHour.length === 1) {
          // First digit - always valid (0-9)
          setTypedHour(e.key);
          onFocusHour?.(Number(e.key));
          typedHourTimeoutRef.current = setTimeout(clearTypedHour, 1000);
        } else if (newTypedHour.length === 2) {
          // Two digits - check if it's a valid hour (00-23)
          if (numericValue >= 0 && numericValue <= 23) {
            setTypedHour(newTypedHour);
            onFocusHour?.(numericValue);
            typedHourTimeoutRef.current = setTimeout(clearTypedHour, 1000);
          } else {
            // Invalid two-digit number, start over with just the new digit
            setTypedHour(e.key);
            onFocusHour?.(Number(e.key));
            typedHourTimeoutRef.current = setTimeout(clearTypedHour, 1000);
          }
        } else {
          // More than 2 digits, start over with just the new digit
          setTypedHour(e.key);
          onFocusHour?.(Number(e.key));
          typedHourTimeoutRef.current = setTimeout(clearTypedHour, 1000);
        }
        e.preventDefault();
        return;
      }

      // Clear typed input on navigation keys
      clearTypedHour();

      switch (e.key) {
        case 'ArrowUp':
          hour = Math.max(0, hour - 1);
          break;
        case 'ArrowDown':
          hour = Math.min(23, hour + 1);
          break;
        case 'PageUp':
          hour = Math.max(0, hour - 5);
          break;
        case 'PageDown':
          hour = Math.min(23, hour + 5);
          break;
        case 'Home':
          hour = 0;
          break;
        case 'End':
          hour = 23;
          break;
        case 'ArrowRight':
          // Move focus to minute list
          if (minuteListRef.current) {
            const targetMinuteItem = minuteListRef.current.querySelector(
              `button[data-minute="${focusedMinute}"]`,
            );
            if (targetMinuteItem) {
              (targetMinuteItem as HTMLButtonElement | null)?.focus();
            } else {
              // If no focused minute, focus the first minute
              const firstMinuteItem = minuteListRef.current.querySelector(
                'button[data-minute]',
              );
              (firstMinuteItem as HTMLButtonElement | null)?.focus();
            }
          }
          break;
        default:
          return;
      }
      onFocusHour?.(hour);
      e.preventDefault();
    },
    [onFocusHour, typedHour, clearTypedHour, focusedMinute],
  );
  const handleKeyDownMinute = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      let minute = Number(e?.currentTarget?.dataset?.minute);

      // Handle numeric input for jumping to minute
      if (/^[0-9]$/.test(e.key)) {
        const newTypedMinute = typedMinute + e.key;
        const numericValue = Number(newTypedMinute);

        // Clear existing timeout
        if (typedMinuteTimeoutRef.current) {
          clearTimeout(typedMinuteTimeoutRef.current);
        }

        // Find the closest valid minute (multiples of 5: 0, 5, 10, 15, ..., 55)
        const findClosestMinute = (value: number): number => {
          if (value >= 55) return 55;
          if (value <= 0) return 0;
          // Round to nearest multiple of 5
          return Math.round(value / 5) * 5;
        };

        // Handle typed input based on length
        if (newTypedMinute.length === 1) {
          // First digit
          setTypedMinute(e.key);
          const singleDigitValue = Number(e.key);
          if (singleDigitValue === 0) {
            onFocusMinute?.(0);
          } else {
            // For single digits 1-9, focus on that digit * 10, then round to nearest 5
            const targetMinute = findClosestMinute(singleDigitValue * 10);
            onFocusMinute?.(targetMinute);
          }
          typedMinuteTimeoutRef.current = setTimeout(clearTypedMinute, 1000);
        } else if (newTypedMinute.length === 2) {
          // Two digits - find closest valid minute
          const closestMinute = findClosestMinute(numericValue);
          setTypedMinute(newTypedMinute);
          onFocusMinute?.(closestMinute);
          typedMinuteTimeoutRef.current = setTimeout(clearTypedMinute, 1000);
        } else {
          // More than 2 digits, start over with just the new digit
          setTypedMinute(e.key);
          const singleDigitValue = Number(e.key);
          if (singleDigitValue === 0) {
            onFocusMinute?.(0);
          } else {
            const targetMinute = findClosestMinute(singleDigitValue * 10);
            onFocusMinute?.(targetMinute);
          }
          typedMinuteTimeoutRef.current = setTimeout(clearTypedMinute, 1000);
        }
        e.preventDefault();
        return;
      }

      // Clear typed input on navigation keys
      clearTypedMinute();

      switch (e.key) {
        case 'ArrowUp':
          minute = Math.max(0, minute - 5);
          break;
        case 'ArrowDown':
          minute = Math.min(55, minute + 5);
          break;
        case 'PageUp':
          minute = Math.max(0, minute - 25);
          break;
        case 'PageDown':
          minute = Math.min(55, minute + 25);
          break;
        case 'Home':
          minute = 0;
          break;
        case 'End':
          minute = 55;
          break;
        case 'ArrowLeft':
          // Move focus to hour list
          if (hourListRef.current) {
            const targetHourItem = hourListRef.current.querySelector(
              `button[data-hour="${focusedHour}"]`,
            );
            if (targetHourItem) {
              (targetHourItem as HTMLButtonElement | null)?.focus();
            } else {
              // If no focused hour, focus the first hour
              const firstHourItem =
                hourListRef.current.querySelector('button[data-hour]');
              (firstHourItem as HTMLButtonElement | null)?.focus();
            }
          }
          break;
        default:
          return;
      }
      onFocusMinute?.(minute);
      e.preventDefault();
    },
    [onFocusMinute, typedMinute, clearTypedMinute, focusedHour],
  );

  return (
    <Flex className={clsx(s.container, className)} gap="1" align="start">
      <div
        className={s.hourList}
        tabIndex={-1}
        ref={hourListRef}
        role="listbox"
        aria-label="Select hour"
        aria-activedescendant={
          focusedHour !== undefined ? `hour-${focusedHour}` : undefined
        }
      >
        {hours.map((hour) => {
          const isFocused = focusedHour === hour;
          const isSelected = selectedHour === hour;
          return (
            <button
              type="button"
              key={hour}
              className={clsx(s.hourItem, {
                [s.focused]: isFocused,
                [s.selected]: isSelected,
              })}
              data-hour={hour}
              onClick={handleClickHour}
              tabIndex={isFocused ? 0 : -1}
              onFocus={handleFocusHour}
              onKeyDown={handleKeyDownHour}
              onBlur={handleBlurHour}
              role="option"
              aria-selected={isSelected}
              aria-label={`${hour} o'clock`}
              id={`hour-${hour}`}
            >
              {hour.toString().padStart(2, '0')}
            </button>
          );
        })}
      </div>
      <div
        className={s.minuteList}
        tabIndex={-1}
        ref={minuteListRef}
        role="listbox"
        aria-label="Select minute"
        aria-activedescendant={
          focusedMinute !== undefined ? `minute-${focusedMinute}` : undefined
        }
      >
        {minutes.map((minute) => {
          const isFocused = focusedMinute === minute;
          const isSelected = selectedMinute === minute;
          return (
            <button
              type="button"
              key={minute}
              className={clsx(s.minuteItem, {
                [s.focused]: isFocused,
                [s.selected]: isSelected,
              })}
              data-minute={minute}
              onClick={handleClickMinute}
              onFocus={handleFocusMinute}
              onKeyDown={handleKeyDownMinute}
              onBlur={handleBlurMinute}
              tabIndex={isFocused ? 0 : -1}
              role="option"
              aria-selected={isSelected}
              aria-label={`${minute} minutes`}
              id={`minute-${minute}`}
            >
              {minute.toString().padStart(2, '0')}
            </button>
          );
        })}
      </div>
    </Flex>
  );
}
