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
  value: Temporal.PlainDate | Temporal.PlainDateTime | undefined;
  min?: Temporal.PlainDate | Temporal.PlainDateTime | undefined;
  max?: Temporal.PlainDate | Temporal.PlainDateTime | undefined;
  onChange: (
    value: Temporal.PlainDate | Temporal.PlainDateTime | undefined,
  ) => void;
};

export type DatePickerState = {
  isOpen: boolean;
  focusedDate: Temporal.PlainDate | Temporal.PlainDateTime;
  selectedDate: Temporal.PlainDate | Temporal.PlainDateTime | undefined;
  hoveredDate: Temporal.PlainDate | Temporal.PlainDateTime | undefined;
  min: Temporal.PlainDate | Temporal.PlainDateTime | undefined;
  max: Temporal.PlainDate | Temporal.PlainDateTime | undefined;
  focusedHour: number | undefined;
  focusedMinute: number | undefined;
  selectedHour: number | undefined;
  selectedMinute: number | undefined;
};
export type DatePickerAction =
  | {
      type: 'setFocusedDate';
      date: Temporal.PlainDate | Temporal.PlainDateTime | undefined;
    }
  | {
      type: 'setSelectedDate';
      date: Temporal.PlainDate | Temporal.PlainDateTime | undefined;
    }
  | {
      type: 'setHoveredDate';
      date: Temporal.PlainDate | Temporal.PlainDateTime | undefined;
    }
  | { type: 'setSelectedHour'; hour: number }
  | { type: 'setSelectedMinute'; minute: number }
  | { type: 'setFocusedHour'; hour: number }
  | { type: 'setFocusedMinute'; minute: number }
  | { type: 'clear' }
  | { type: 'toggle' }
  | { type: 'open' }
  | { type: 'close' };
