import {
  ChevronDownIcon,
  ChevronUpIcon,
  Cross1Icon,
} from '@radix-ui/react-icons';
import { Button } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback, useReducer } from 'react';
import { CalendarMonth } from './CalendarMonth';
import s from './DatePicker.module.css';
import { DateTimePickerMode } from './DateTimePickerMode';
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
  console.log(
    '!! datePickerReducer',
    action,
    'date' in action ? action.date?.toISO() : null,
  );
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

export function DateTimePicker(props: DatePickerProps) {
  const [state, dispatch] = useReducer(datePickerReducer, {
    isOpen: false,
    focusedDate: props.value?.startOf('day') ?? DateTime.now().startOf('day'),
    selectedDate: props.value?.startOf('day') ?? DateTime.now().startOf('day'),
    selectedDateTime: props.value,
    hoveredDate: undefined,
    focusedHour: props.value?.hour,
    focusedMinute: props.value?.minute,
    selectedHour: props.value?.hour,
    selectedMinute: props.value?.minute,
    min: props.min?.startOf('day') ?? undefined,
    max: props.max?.startOf('day') ?? undefined,
  });
  const handleFocusDay = useCallback((date: DateTime) => {
    dispatch({ type: 'setFocusedDate', date });
  }, []);
  const handleSelectDay = useCallback((date: DateTime) => {
    dispatch({ type: 'setSelectedDate', date });
  }, []);

  const handleSelectHour = useCallback((hour: number) => {
    dispatch({ type: 'setSelectedHour', hour });
  }, []);
  const handleSelectMinute = useCallback((minute: number) => {
    dispatch({ type: 'setSelectedMinute', minute });
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
  const handleTriggerButtonClicked = useCallback(() => {
    dispatch({ type: 'toggle' });
    // Focus moving to selected date is handled in CalendarMonth
  }, []);
  const handleClearButtonClicked = useCallback(() => {
    if (!props.clearable) return;
    dispatch({ type: 'clear' });
    dispatch({ type: 'close' });
    props.onChange(undefined);
  }, [props.onChange, props.clearable]);

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

  const handleDialogKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        dispatch({ type: 'close' });
      } else if (event.key === 'Enter') {
        handleSubmit();
      }
    },
    [handleSubmit],
  );
  const handleOkButtonClicked = useCallback(() => {
    handleSubmit();
  }, [handleSubmit]);
  const handleCancelButtonClicked = useCallback(() => {
    dispatch({ type: 'close' });
  }, []);

  return (
    <div className={s.datePicker}>
      <Button
        variant="outline"
        color="gray"
        className={s.triggerButton}
        onClick={handleTriggerButtonClicked}
        aria-expanded={state.isOpen}
        aria-haspopup="dialog"
        aria-label="Select date"
      >
        {props.value?.toFormat(
          props.mode === DateTimePickerMode.DateTime
            ? 'd LLLL yyyy HH:mm'
            : 'd LLLL yyyy',
        ) ?? 'Select date'}
        {state.isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
      </Button>
      {props.clearable ? (
        <Button
          variant="outline"
          color="gray"
          className={s.triggerButton}
          onClick={handleClearButtonClicked}
          aria-label="Clear date"
        >
          <Cross1Icon />
        </Button>
      ) : null}
      {state.isOpen ? (
        // biome-ignore lint/a11y/noStaticElementInteractions: Need to close dialog on ESC key
        <div className={s.pickerDialog} onKeyDown={handleDialogKeyDown}>
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
            />
            {props.mode === DateTimePickerMode.DateTime ? (
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
            ) : null}
          </div>
          <div className={s.dialogButtons}>
            <Button
              type="button"
              disabled={props.disabled}
              variant="solid"
              onClick={handleOkButtonClicked}
            >
              OK
            </Button>
            <Button
              type="reset"
              variant="outline"
              disabled={props.disabled}
              onClick={handleCancelButtonClicked}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
