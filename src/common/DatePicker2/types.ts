import type { DateTimePickerModeType } from './DateTimePickerMode';
export type DatePickerProps = {
  clearable?: boolean;
  disabled?: boolean;

  name?: string; // For form submission
  required?: boolean; // For form validation
  'aria-describedby'?: string; // For linking to help text or error messages
  'aria-invalid'?: boolean; // For validation state
  'aria-label'?: string; // Custom label for trigger button
  placeholder?: string; // Custom placeholder text

  mode: DateTimePickerModeType;
  /** value will be PlainDate if mode is 'date'; value will be PlainDateTime if mode is 'datetime'; value will be undefined if it is cleared */
  value: Temporal.PlainDate | Temporal.PlainDateTime | undefined;
  min?: Temporal.PlainDate | undefined;
  max?: Temporal.PlainDate | undefined;
  onChange: (
    /** value will be PlainDate if mode is 'date'; value will be PlainDateTime if mode is 'datetime'; value will be undefined if it is cleared */
    value: Temporal.PlainDate | Temporal.PlainDateTime | undefined,
  ) => void;
};

export type DatePickerState = {
  isOpen: boolean;
  focusedDate: Temporal.PlainDate;
  selectedDate: Temporal.PlainDate | undefined;
  hoveredDate: Temporal.PlainDate | undefined;
  min: Temporal.PlainDate | undefined;
  max: Temporal.PlainDate | undefined;
  focusedHour: number | undefined;
  focusedMinute: number | undefined;
  selectedHour: number | undefined;
  selectedMinute: number | undefined;
};
export type DatePickerAction =
  | {
      type: 'setFocusedDate';
      date: Temporal.PlainDate;
    }
  | {
      type: 'setSelectedDate';
      date: Temporal.PlainDate;
    }
  | {
      type: 'setHoveredDate';
      date: Temporal.PlainDate;
    }
  | { type: 'setSelectedHour'; hour: number }
  | { type: 'setSelectedMinute'; minute: number }
  | { type: 'setFocusedHour'; hour: number }
  | { type: 'setFocusedMinute'; minute: number }
  | { type: 'clear' }
  | { type: 'toggle' }
  | { type: 'open' }
  | { type: 'close' };
