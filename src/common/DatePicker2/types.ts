import type { DateTimePickerModeType } from './DateTimePickerMode';
export type DatePickerProps<TMode extends DateTimePickerModeType> = {
  clearable?: boolean;
  disabled?: boolean;

  name?: string; // For form submission
  required?: boolean; // For form validation
  'aria-describedby'?: string; // For linking to help text or error messages
  'aria-invalid'?: boolean; // For validation state
  'aria-label'?: string; // Custom label for trigger button
  placeholder?: string; // Custom placeholder text
} & DatePickerPropsInner<TMode>;

type DatePickerPropsInner<TMode extends DateTimePickerModeType> =
  TMode extends 'date'
    ? {
        mode: 'date';
        value: Temporal.PlainDate | undefined;
        min?: Temporal.PlainDate | undefined;
        max?: Temporal.PlainDate | undefined;
        onChange: (value: Temporal.PlainDate | undefined) => void;
      }
    : {
        mode: 'datetime';
        value: Temporal.PlainDateTime | undefined;
        min?: Temporal.PlainDateTime | undefined;
        max?: Temporal.PlainDateTime | undefined;
        onChange: (value: Temporal.PlainDateTime | undefined) => void;
      };

export type DatePickerState<TMode extends DateTimePickerModeType> = {
  isOpen: boolean;
  focusedHour: number | undefined;
  focusedMinute: number | undefined;
  selectedHour: number | undefined;
  selectedMinute: number | undefined;
} & DatePickerStateInner<TMode>;
type DatePickerStateInner<TMode extends DateTimePickerModeType> =
  TMode extends 'date'
    ? {
        focusedDate: Temporal.PlainDate | undefined;
        selectedDate: Temporal.PlainDate | undefined;
        hoveredDate: Temporal.PlainDate | undefined;
        selectedDateTime: Temporal.PlainDate | undefined;
        min: Temporal.PlainDate | undefined;
        max: Temporal.PlainDate | undefined;
      }
    : {
        focusedDate: Temporal.PlainDateTime | undefined;
        selectedDate: Temporal.PlainDateTime | undefined;
        hoveredDate: Temporal.PlainDateTime | undefined;
        selectedDateTime: Temporal.PlainDateTime | undefined;
        min: Temporal.PlainDateTime | undefined;
        max: Temporal.PlainDateTime | undefined;
      };

export type DatePickerAction<TMode extends DateTimePickerModeType> =
  | (
      | { type: 'setSelectedHour'; hour: number }
      | { type: 'setSelectedMinute'; minute: number }
      | { type: 'setFocusedHour'; hour: number }
      | { type: 'setFocusedMinute'; minute: number }
      | { type: 'clear' }
      | { type: 'toggle' }
      | { type: 'open' }
      | { type: 'close' }
    )
  | DatePickerActionInner<TMode>;

type DatePickerActionInner<TMode extends DateTimePickerModeType> =
  TMode extends 'date'
    ?
        | {
            type: 'setFocusedDate';
            date: Temporal.PlainDate | undefined;
          }
        | {
            type: 'setSelectedDate';
            date: Temporal.PlainDate | undefined;
          }
        | {
            type: 'setHoveredDate';
            date: Temporal.PlainDate | undefined;
          }
    :
        | {
            type: 'setFocusedDate';
            date: Temporal.PlainDateTime | undefined;
          }
        | {
            type: 'setSelectedDate';
            date: Temporal.PlainDateTime | undefined;
          }
        | {
            type: 'setHoveredDate';
            date: Temporal.PlainDateTime | undefined;
          };
