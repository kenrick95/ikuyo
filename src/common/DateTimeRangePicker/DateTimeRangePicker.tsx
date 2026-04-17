import { Popover } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { memo, useCallback, useMemo, useState } from 'react';
import { CalendarMonth } from '../DatePicker2/CalendarMonth';
import { TimeZoneSelect } from '../TimeZoneSelect/TimeZoneSelect';
import s from './DateTimeRangePicker.module.css';
import { TimeDropdown } from './TimeDropdown';

export interface DateTimeRangePickerProps {
  startDateTime: DateTime | undefined;
  endDateTime: DateTime | undefined;
  startTimeZone: string;
  endTimeZone: string;
  defaultTimeZone: string;
  min?: DateTime;
  max?: DateTime;
  disabled?: boolean;
  onStartDateTimeChange: (dt: DateTime | undefined) => void;
  onEndDateTimeChange: (dt: DateTime | undefined) => void;
  onStartTimeZoneChange: (tz: string) => void;
  onEndTimeZoneChange: (tz: string) => void;
}

function DateTimeRangePickerInner({
  startDateTime,
  endDateTime,
  startTimeZone,
  endTimeZone,
  defaultTimeZone,
  min,
  max,
  disabled,
  onStartDateTimeChange,
  onEndDateTimeChange,
  onStartTimeZoneChange,
  onEndTimeZoneChange,
}: DateTimeRangePickerProps) {
  // Derived: is timezone mode enabled?
  const [showTimeZones, setShowTimeZones] = useState(() => {
    return startTimeZone !== defaultTimeZone || endTimeZone !== defaultTimeZone;
  });

  // Calendar popover states
  const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false);
  const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false);

  // Calendar focused dates
  const [startFocusedDate, setStartFocusedDate] = useState(
    () => startDateTime?.startOf('day') ?? DateTime.now().startOf('day'),
  );
  const [endFocusedDate, setEndFocusedDate] = useState(
    () =>
      endDateTime?.startOf('day') ??
      startDateTime?.startOf('day') ??
      DateTime.now().startOf('day'),
  );

  const minDay = useMemo(() => min?.startOf('day'), [min]);
  const maxDay = useMemo(() => max?.startOf('day'), [max]);

  // Are start and end on the same day?
  const isSameDay = useMemo(() => {
    if (!startDateTime || !endDateTime) return true;
    return startDateTime.hasSame(endDateTime, 'day');
  }, [startDateTime, endDateTime]);

  // --- Helpers to build DateTime from date + time parts ---
  const buildDateTime = useCallback(
    (date: DateTime, hour: number, minute: number, tz: string) => {
      return date
        .set({ hour, minute, second: 0, millisecond: 0 })
        .setZone(tz, { keepLocalTime: true });
    },
    [],
  );

  // --- Start date selection ---
  const handleSelectStartDay = useCallback(
    (date: DateTime) => {
      const hour = startDateTime?.hour ?? 9;
      const minute = startDateTime?.minute ?? 0;
      const newStart = buildDateTime(date, hour, minute, startTimeZone);
      onStartDateTimeChange(newStart);
      setIsStartCalendarOpen(false);
    },
    [startDateTime, startTimeZone, buildDateTime, onStartDateTimeChange],
  );

  const handleSelectEndDay = useCallback(
    (date: DateTime) => {
      const hour = endDateTime?.hour ?? 10;
      const minute = endDateTime?.minute ?? 0;
      const newEnd = buildDateTime(date, hour, minute, endTimeZone);
      onEndDateTimeChange(newEnd);
      setIsEndCalendarOpen(false);
    },
    [endDateTime, endTimeZone, buildDateTime, onEndDateTimeChange],
  );

  // --- Time changes ---
  const handleStartTimeChange = useCallback(
    (hour: number, minute: number) => {
      const date =
        startDateTime?.startOf('day') ?? DateTime.now().startOf('day');
      const newStart = buildDateTime(date, hour, minute, startTimeZone);
      onStartDateTimeChange(newStart);
    },
    [startDateTime, startTimeZone, buildDateTime, onStartDateTimeChange],
  );

  const handleEndTimeChange = useCallback(
    (hour: number, minute: number) => {
      const date =
        endDateTime?.startOf('day') ??
        startDateTime?.startOf('day') ??
        DateTime.now().startOf('day');
      const newEnd = buildDateTime(date, hour, minute, endTimeZone);
      onEndDateTimeChange(newEnd);
    },
    [
      startDateTime,
      endDateTime,
      endTimeZone,
      buildDateTime,
      onEndDateTimeChange,
    ],
  );

  const handleToggleTimeZones = useCallback(() => {
    setShowTimeZones((prev) => !prev);
  }, []);

  // --- Calendar hover (no-op, required by CalendarMonth) ---
  const noopHover = useCallback(() => {}, []);

  // --- Display values ---
  const startDateDisplay = startDateTime
    ? startDateTime.toFormat('ccc, d LLL yyyy')
    : 'Set date';

  const endDateDisplay = endDateTime
    ? endDateTime.toFormat('ccc, d LLL yyyy')
    : 'Set end date';

  return (
    <div className={s.container}>
      {/* Start row: [Date] [StartTime] – [EndTime] [EndDate] */}
      <div className={s.mainRow}>
        <Popover.Root
          open={isStartCalendarOpen}
          onOpenChange={setIsStartCalendarOpen}
        >
          <Popover.Trigger>
            <button
              type="button"
              className={s.dateButton}
              disabled={disabled}
              data-state={isStartCalendarOpen ? 'open' : 'closed'}
              aria-label="Select start date"
            >
              {startDateDisplay}
            </button>
          </Popover.Trigger>
          <Popover.Content
            className={s.calendarPopover}
            align="start"
            sideOffset={4}
            avoidCollisions
          >
            <CalendarMonth
              yearMonth={startFocusedDate}
              focusedDate={startFocusedDate}
              selectedDate={startDateTime?.startOf('day')}
              onFocusDay={setStartFocusedDate}
              onSelectDay={handleSelectStartDay}
              onHoverDay={noopHover}
              min={minDay}
              max={maxDay}
              disabled={disabled}
            />
          </Popover.Content>
        </Popover.Root>

        <TimeDropdown
          hour={startDateTime?.hour}
          minute={
            startDateTime ? roundToNearest5(startDateTime.minute) : undefined
          }
          onChange={handleStartTimeChange}
          disabled={disabled}
          aria-label="Start time"
        />

        <span className={s.dash} aria-hidden="true">
          –
        </span>

        <TimeDropdown
          hour={endDateTime?.hour}
          minute={endDateTime ? roundToNearest5(endDateTime.minute) : undefined}
          onChange={handleEndTimeChange}
          referenceDateTime={startDateTime}
          currentDate={endDateTime?.startOf('day')}
          minHour={startDateTime?.hour}
          minMinute={
            startDateTime ? roundToNearest5(startDateTime.minute) : undefined
          }
          isSameDay={isSameDay}
          disabled={disabled}
          aria-label="End time"
        />

        <Popover.Root
          open={isEndCalendarOpen}
          onOpenChange={setIsEndCalendarOpen}
        >
          <Popover.Trigger>
            <button
              type="button"
              className={s.dateButton}
              disabled={disabled}
              data-state={isEndCalendarOpen ? 'open' : 'closed'}
              aria-label="Select end date"
            >
              {endDateDisplay}
            </button>
          </Popover.Trigger>
          <Popover.Content
            className={s.calendarPopover}
            align="start"
            sideOffset={4}
            avoidCollisions
          >
            <CalendarMonth
              yearMonth={endFocusedDate}
              focusedDate={endFocusedDate}
              selectedDate={endDateTime?.startOf('day')}
              onFocusDay={setEndFocusedDate}
              onSelectDay={handleSelectEndDay}
              onHoverDay={noopHover}
              min={minDay}
              max={maxDay}
              disabled={disabled}
            />
          </Popover.Content>
        </Popover.Root>
      </div>

      {/* Time zone rows */}
      {showTimeZones && (
        <>
          <div className={s.timeZoneRow}>
            <span className={s.timeZoneLabel}>Start TZ</span>
            <TimeZoneSelect
              id="dtrp-tz-start"
              name="timeZoneStart"
              value={startTimeZone}
              handleChange={onStartTimeZoneChange}
              isFormLoading={!!disabled}
            />
          </div>
          <div className={s.timeZoneRow}>
            <span className={s.timeZoneLabel}>End TZ</span>
            <TimeZoneSelect
              id="dtrp-tz-end"
              name="timeZoneEnd"
              value={endTimeZone}
              handleChange={onEndTimeZoneChange}
              isFormLoading={!!disabled}
            />
          </div>
        </>
      )}

      {/* Toggle links */}
      <div className={s.toggleRow}>
        <button
          type="button"
          className={s.toggleLink}
          onClick={handleToggleTimeZones}
        >
          {showTimeZones ? 'Hide time zones' : 'Time zones'}
        </button>
      </div>
    </div>
  );
}

function roundToNearest5(n: number): number {
  return Math.round(n / 5) * 5;
}

export const DateTimeRangePicker = memo(DateTimeRangePickerInner);
