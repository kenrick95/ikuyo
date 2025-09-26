import {
  ChevronDownIcon,
  ChevronUpIcon,
  Cross1Icon,
} from '@radix-ui/react-icons';
import { Button, Popover } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { forwardRef, useCallback, useReducer, useState } from 'react';
import { CalendarMonth } from './CalendarMonth';
import s from './DateTimePicker.module.css';
import { DateTimePickerMode } from './DateTimePickerMode';
import { LiveRegion } from './LiveRegion';
import { TimeSelector } from './TimeSelector';
import type {
  DatePickerAction,
  DatePickerProps,
  DatePickerState,
} from './types';

function datePickerReducer(
  state: DatePickerState,
  action: DatePickerAction,
): DatePickerState {
  // console.log(
  //   '!! datePickerReducer',
  //   action,
  //   'date' in action ? action.date?.toISO() : null,
  // );
  switch (action.type) {
    case 'setFocusedDate': {
      return { ...state, focusedDate: action.date };
    }
    case 'setFocusedHour': {
      return { ...state, focusedHour: action.hour };
    }
    case 'setFocusedMinute': {
      return { ...state, focusedMinute: action.minute };
    }
    case 'setSelectedDate': {
      const selectedDateTime = action.date?.set({
        hour: state.selectedHour ?? 0,
        minute: state.selectedMinute ?? 0,
        second: 0,
        millisecond: 0,
      });
      return {
        ...state,
        selectedDate: action.date,
        focusedDate: action.date,
        selectedDateTime,
      };
    }
    case 'setSelectedHour': {
      const selectedDateTime = state.selectedDateTime?.set({
        hour: action.hour,
        minute: state.selectedMinute ?? 0,
        second: 0,
        millisecond: 0,
      });
      return {
        ...state,
        selectedHour: action.hour,
        focusedHour: action.hour,
        selectedDateTime,
      };
    }
    case 'setSelectedMinute': {
      const selectedDateTime = state.selectedDateTime?.set({
        hour: state.selectedHour ?? 0,
        minute: action.minute,
        second: 0,
        millisecond: 0,
      });
      return {
        ...state,
        selectedMinute: action.minute,
        focusedMinute: action.minute,
        selectedDateTime,
      };
    }
    case 'setHoveredDate': {
      return { ...state, hoveredDate: action.date };
    }
    case 'toggle': {
      return { ...state, isOpen: !state.isOpen };
    }
    case 'close': {
      return { ...state, isOpen: false };
    }
    case 'open': {
      return { ...state, isOpen: true };
    }
    case 'clear': {
      return {
        ...state,
        selectedDate: undefined,
        selectedHour: undefined,
        selectedMinute: undefined,
      };
    }
    default:
      return state;
  }
}

export const DateTimePicker = forwardRef<HTMLButtonElement, DatePickerProps>(
  (props, ref) => {
    const [state, dispatch] = useReducer(datePickerReducer, {
      isOpen: false,
      // We need at least focusedDate to decide which month to show, else we can't show anything
      focusedDate: props.value?.startOf('day') ?? DateTime.now().startOf('day'),
      selectedDate: props.value?.startOf('day') ?? undefined,
      selectedDateTime: props.value,
      hoveredDate: undefined,
      focusedHour: props.value?.hour,
      focusedMinute: props.value?.minute,
      selectedHour: props.value?.hour,
      selectedMinute: props.value?.minute,
      min: props.min?.startOf('day') ?? undefined,
      max: props.max?.startOf('day') ?? undefined,
    });

    const [liveMessage, setLiveMessage] = useState('');
    const handleFocusDay = useCallback((date: DateTime) => {
      dispatch({ type: 'setFocusedDate', date });
      setLiveMessage(`${date.toFormat('cccc, MMMM d, yyyy')}`);
    }, []);

    const handleSelectDay = useCallback((date: DateTime) => {
      dispatch({ type: 'setSelectedDate', date });
      setLiveMessage(`Selected ${date.toFormat('cccc, MMMM d, yyyy')}`);
    }, []);

    const handleSelectHour = useCallback((hour: number) => {
      dispatch({ type: 'setSelectedHour', hour });
      setLiveMessage(`Hour ${hour}`);
    }, []);

    const handleSelectMinute = useCallback((minute: number) => {
      dispatch({ type: 'setSelectedMinute', minute });
      setLiveMessage(`Minute ${minute}`);
    }, []);
    const handleFocusHour = useCallback((hour: number) => {
      dispatch({ type: 'setFocusedHour', hour });
    }, []);
    const handleFocusMinute = useCallback((minute: number) => {
      dispatch({ type: 'setFocusedMinute', minute });
    }, []);

    const handleHoverDay = useCallback((date: DateTime) => {
      dispatch({ type: 'setHoveredDate', date });
    }, []);
    const handleClearButtonClicked = useCallback(() => {
      if (!props.clearable) return;
      dispatch({ type: 'clear' });
      dispatch({ type: 'close' });
      props.onChange(undefined);
    }, [props.onChange, props.clearable]);
    const handleCancelButtonClicked = useCallback(() => {
      // Change selected to previous value (original value in props)
      const originalDate = props.value;
      if (originalDate) {
        dispatch({
          type: 'setSelectedDate',
          date: originalDate.startOf('day'),
        });
        if (props.mode === DateTimePickerMode.DateTime) {
          dispatch({ type: 'setSelectedHour', hour: originalDate.hour });
          dispatch({ type: 'setSelectedMinute', minute: originalDate.minute });
        }
      }

      dispatch({ type: 'close' });
    }, [props.value, props.mode]);

    const handleSubmit = useCallback(() => {
      if (props.mode === DateTimePickerMode.Date) {
        if (state.selectedDate) {
          props.onChange?.(state.selectedDate);
        }
      } else if (
        state.selectedDate &&
        state.selectedHour !== undefined &&
        state.selectedMinute !== undefined
      ) {
        const date = state.selectedDate.set({
          hour: state.selectedHour,
          minute: state.selectedMinute,
          second: 0,
          millisecond: 0,
        });
        props.onChange?.(date);
      }
      dispatch({ type: 'close' });
    }, [
      props.onChange,
      props.mode,
      state.selectedDate,
      state.selectedHour,
      state.selectedMinute,
    ]);

    const handleOkButtonClicked = useCallback(() => {
      handleSubmit();
    }, [handleSubmit]);

    const closePopoverContent = useCallback(() => {
      dispatch({ type: 'close' });
    }, []);

    const handleOpenChange = useCallback((open: boolean) => {
      if (open) {
        dispatch({ type: 'open' });
      } else {
        dispatch({ type: 'close' });
      }
    }, []);

    const formattedValue = props.value?.toISO() || '';

    return (
      <>
        {/* A11Y: Live region for screen reader announcements */}
        <LiveRegion message={liveMessage} />

        {/* A11Y: Hidden input for form integration */}
        {props.name && (
          <input
            type="hidden"
            name={props.name}
            value={formattedValue}
            required={props.required}
            aria-hidden="true"
          />
        )}

        <div className={s.datePicker}>
          <Popover.Root open={state.isOpen} onOpenChange={handleOpenChange}>
            <Popover.Trigger>
              <Button
                ref={ref}
                variant="outline"
                color="gray"
                className={s.triggerButton}
                aria-label={props['aria-label'] || 'Select date'}
                aria-describedby={props['aria-describedby']}
                aria-invalid={props['aria-invalid']}
                disabled={props.disabled}
              >
                {props.value?.toFormat(
                  props.mode === DateTimePickerMode.DateTime
                    ? 'd LLLL yyyy HH:mm'
                    : 'd LLLL yyyy',
                ) ??
                  (props.placeholder || 'Select date')}
                {state.isOpen ? (
                  <ChevronUpIcon aria-hidden="true" />
                ) : (
                  <ChevronDownIcon aria-hidden="true" />
                )}
              </Button>
            </Popover.Trigger>

            {props.clearable && (
              <Button
                variant="outline"
                color="gray"
                className={s.clearButton}
                onClick={handleClearButtonClicked}
                aria-label="Clear date"
                disabled={props.disabled || !props.value}
              >
                <Cross1Icon aria-hidden="true" />
              </Button>
            )}

            <Popover.Content
              className={s.pickerDialog}
              align="start"
              onEscapeKeyDown={closePopoverContent}
              minWidth="330px"
              maxWidth="min(480px, 95vw)"
              avoidCollisions={true}
            >
              <div className={s.calendarAndTime}>
                <CalendarMonth
                  yearMonth={state.focusedDate}
                  focusedDate={state.focusedDate}
                  selectedDate={state.selectedDate}
                  onFocusDay={handleFocusDay}
                  onSelectDay={handleSelectDay}
                  onHoverDay={handleHoverDay}
                  max={state.max}
                  min={state.min}
                  disabled={props.disabled}
                  onLiveAnnouncement={setLiveMessage}
                />
                {props.mode === DateTimePickerMode.DateTime && (
                  <TimeSelector
                    disabled={props.disabled}
                    focusedHour={state.focusedHour}
                    focusedMinute={state.focusedMinute}
                    selectedHour={state.selectedHour}
                    selectedMinute={state.selectedMinute}
                    onSelectHour={handleSelectHour}
                    onSelectMinute={handleSelectMinute}
                    onFocusHour={handleFocusHour}
                    onFocusMinute={handleFocusMinute}
                  />
                )}
              </div>

              <div className={s.dialogButtons}>
                <Button
                  type="reset"
                  variant="outline"
                  disabled={props.disabled}
                  onClick={handleCancelButtonClicked}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={props.disabled}
                  variant="solid"
                  onClick={handleOkButtonClicked}
                >
                  OK
                </Button>
              </div>
            </Popover.Content>
          </Popover.Root>
        </div>
      </>
    );
  },
);
