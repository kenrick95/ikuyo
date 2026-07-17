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
import { toFormat } from '../dateTime/temporalFormatter';
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
  //   'date' in action ? action.date?  : null,
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

    const valueDate =
      props.value instanceof Temporal.PlainDateTime
        ? props.value.toPlainDate()
        : (props.value as Temporal.PlainDate | undefined);
    return {
      isOpen: false,
      // We need at least focusedDate to decide which month to show, else we can't show anything
      focusedDate: valueDate ?? Temporal.Now.plainDateISO(),
      selectedDate: valueDate,
      hoveredDate: undefined,
      ...ret,
      min: props.min,
      max: props.max,
    };
  });

  // Handle props.value change from outside
  useEffect(() => {
    if (props.value) {
      if (props.mode === DateTimePickerMode.DateTime) {
        const dateTime = props.value as Temporal.PlainDateTime;
        dispatch({
          type: 'setSelectedDate',
          date: dateTime.toPlainDate(),
        });
        dispatch({ type: 'setSelectedHour', hour: dateTime.hour });
        dispatch({ type: 'setSelectedMinute', minute: dateTime.minute });
      } else {
        const date = props.value as Temporal.PlainDate;
        dispatch({
          type: 'setSelectedDate',
          date: date,
        });
      }
    } else {
      dispatch({ type: 'clear' });
    }
  }, [props.value, props.mode]);

  const [liveMessage, setLiveMessage] = useState('');
  const handleFocusDay = useCallback((date: Temporal.PlainDate) => {
    dispatch({ type: 'setFocusedDate', date });
    setLiveMessage(`${toFormat('cccc, MMMM d, yyyy', date)}`);
  }, []);

  const handleSelectDay = useCallback((date: Temporal.PlainDate) => {
    dispatch({ type: 'setSelectedDate', date });
    setLiveMessage(`Selected ${toFormat('cccc, MMMM d, yyyy', date)}`);
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
    const value = props.value;
    if (value) {
      if (props.mode === DateTimePickerMode.DateTime) {
        // Because props.mode === 'datetime', originalDate must be Temporal.PlainDateTime
        const dateTime = value as Temporal.PlainDateTime;
        dispatch({
          type: 'setSelectedDate',
          date: dateTime.toPlainDate(),
        });
        dispatch({
          type: 'setSelectedHour',
          hour: dateTime.hour,
        });
        dispatch({
          type: 'setSelectedMinute',
          minute: dateTime.minute,
        });
      } else {
        const date = value as Temporal.PlainDate;
        dispatch({
          type: 'setSelectedDate',
          date,
        });
      }
    }

    dispatch({ type: 'close' });
  }, [props.value, props.mode]);

  const handleSubmit = useCallback(() => {
    if (state.selectedDate && props.onChange) {
      if (props.mode === DateTimePickerMode.DateTime) {
        props.onChange(
          Temporal.PlainDateTime.from(state.selectedDate).withPlainTime({
            hour: state.selectedHour ?? 0,
            minute: state.selectedMinute ?? 0,
            second: 0,
            millisecond: 0,
          }),
        );
      } else {
        props.onChange(state.selectedDate);
      }
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
                  ? toFormat(
                      'd LLLL yyyy HH:mm',
                      props.value as Temporal.PlainDateTime,
                    )
                  : toFormat('d LLLL yyyy', props.value as Temporal.PlainDate)
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
}

export const DateTimePicker = forwardRef(DateTimePickerInner);
