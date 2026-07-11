/** biome-ignore-all lint/correctness/useHookAtTopLevel: Biome bug:https://github.com/biomejs/biome/issues/9195 */
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Cross1Icon,
} from '@radix-ui/react-icons';
import { Button, Popover } from '@radix-ui/themes';
import {
  forwardRef,
  useCallback,
  useEffect,
  useReducer,
  useState,
} from 'react';
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

function formatLiveMessage(date: Temporal.PlainDate | Temporal.PlainDateTime) {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
function formatDate(plainDate: Temporal.PlainDate) {
  // TODO: customize format to match Luxon's "d LLLL yyyy"
  return plainDate.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
function formatDateTime(plainDateTime: Temporal.PlainDateTime) {
  // TODO: customize format to match Luxon's "d LLLL yyyy HH:mm"
  return plainDateTime.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
}

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
      return {
        ...state,
        selectedDate: action.date,
        focusedDate: action.date,
      };
    }
    case 'setSelectedHour': {
      return {
        ...state,
        selectedHour: action.hour,
        focusedHour: action.hour,
      };
    }
    case 'setSelectedMinute': {
      return {
        ...state,
        selectedMinute: action.minute,
        focusedMinute: action.minute,
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

function DateTimePickerInner(
  props: DatePickerProps,
  ref: React.ForwardedRef<HTMLButtonElement>,
) {
  // TODO: change all internal state to temporal
  // TODO: then change usage to read from temporal instead of luxon DateTime
  const [state, dispatch] = useReducer(datePickerReducer, props, (props) => {
    const mode = props.mode;
    const ret =
      mode === DateTimePickerMode.DateTime
        ? {
            focusedHour: (props.value as Temporal.PlainDateTime | undefined)
              ?.hour,
            focusedMinute: (props.value as Temporal.PlainDateTime | undefined)
              ?.minute,
            selectedHour: (props.value as Temporal.PlainDateTime | undefined)
              ?.hour,
            selectedMinute: (props.value as Temporal.PlainDateTime | undefined)
              ?.minute,
          }
        : {
            focusedHour: undefined,
            focusedMinute: undefined,
            selectedHour: undefined,
            selectedMinute: undefined,
          };
    return {
      isOpen: false,
      // We need at least focusedDate to decide which month to show, else we can't show anything
      focusedDate:
        props.value ??
        (props.mode === DateTimePickerMode.Date
          ? Temporal.Now.plainDateISO()
          : Temporal.Now.plainDateTimeISO()),
      selectedDate: props.value,
      hoveredDate: undefined,
      ...ret,
      min: props.min,
      max: props.max,
    };
  });

  // Handle props.value change from outside
  useEffect(() => {
    if (props.value) {
      dispatch({
        type: 'setSelectedDate',
        date: props.value,
      });
      if (props.mode === DateTimePickerMode.DateTime) {
        dispatch({ type: 'setSelectedHour', hour: props.value.hour });
        dispatch({ type: 'setSelectedMinute', minute: props.value.minute });
      }
    } else {
      dispatch({ type: 'clear' });
    }
  }, [props.value, props.mode]);

  const [liveMessage, setLiveMessage] = useState('');
  const handleFocusDay = useCallback((date: Temporal.PlainDate) => {
    dispatch({ type: 'setFocusedDate', date });
    setLiveMessage(`${formatLiveMessage(date)}`);
  }, []);

  const handleSelectDay = useCallback((date: Temporal.PlainDate) => {
    dispatch({ type: 'setSelectedDate', date });
    setLiveMessage(`Selected ${formatLiveMessage(date)}`);
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

  const handleHoverDay = useCallback((date: Temporal.PlainDate) => {
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
        date: originalDate,
      });
      if (props.mode === DateTimePickerMode.DateTime) {
        // Because props.mode === 'datetime', originalDate must be Temporal.PlainDateTime
        const originalDateTime = originalDate as Temporal.PlainDateTime;
        dispatch({
          type: 'setSelectedHour',
          hour: originalDateTime.hour,
        });
        dispatch({
          type: 'setSelectedMinute',
          minute: originalDateTime.minute,
        });
      }
    }

    dispatch({ type: 'close' });
  }, [props.value, props.mode]);

  const handleSubmit = useCallback(() => {
    if (props.mode === DateTimePickerMode.Date) {
      if (state.selectedDate) {
        props.onChange?.(state.selectedDate);
      }
    } else if (state.selectedDate) {
      const date = state.selectedDate.set({
        hour: state.selectedHour ?? 0,
        minute: state.selectedMinute ?? 0,
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

  const formattedValue = props.value?.toString() || '';

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
              aria-label={
                props['aria-label'] ||
                (props.mode === DateTimePickerMode.DateTime
                  ? 'Select date & time'
                  : 'Select date')
              }
              aria-describedby={props['aria-describedby']}
              aria-invalid={props['aria-invalid']}
              disabled={props.disabled}
            >
              {props.value
                ? props.mode === DateTimePickerMode.DateTime
                  ? formatDateTime(props.value as Temporal.PlainDateTime)
                  : formatDate(props.value as Temporal.PlainDate)
                : props.placeholder ||
                  (props.mode === DateTimePickerMode.DateTime
                    ? 'Select date & time'
                    : 'Select date')}
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
                yearMonth={
                  state.focusedDate instanceof Temporal.PlainDateTime
                    ? state.focusedDate.toPlainDate()
                    : state.focusedDate
                }
                focusedDate={
                  state.focusedDate instanceof Temporal.PlainDateTime
                    ? state.focusedDate.toPlainDate()
                    : state.focusedDate
                }
                selectedDate={
                  state.selectedDate instanceof Temporal.PlainDateTime
                    ? state.selectedDate.toPlainDate()
                    : state.selectedDate
                }
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
}

export const DateTimePicker = forwardRef(DateTimePickerInner);
