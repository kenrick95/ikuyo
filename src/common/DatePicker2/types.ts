import type { DateTime } from 'luxon';
import type { DateTimePickerModeType } from './DateTimePickerMode';

export interface DatePickerProps {
  value: DateTime | undefined;
  min?: DateTime;
  max?: DateTime;
  mode: DateTimePickerModeType;
  clearable?: boolean;
  onChange: (value: DateTime | undefined) => void;
  disabled?: boolean;

  name?: string; // For form submission
  required?: boolean; // For form validation
  'aria-describedby'?: string; // For linking to help text or error messages
  'aria-invalid'?: boolean; // For validation state
  'aria-label'?: string; // Custom label for trigger button
  placeholder?: string; // Custom placeholder text
}

export interface DatePickerState {
  isOpen: boolean;
  focusedDate: DateTime;
  selectedDate: DateTime | undefined;
  hoveredDate: DateTime | undefined;
  min: DateTime | undefined;
  max: DateTime | undefined;

  focusedHour: number | undefined;
  focusedMinute: number | undefined;
  selectedHour: number | undefined;
  selectedMinute: number | undefined;

  selectedDateTime: DateTime | undefined;
}
export type DatePickerAction =
  | { type: 'setFocusedDate'; date: DateTime }
  | { type: 'setSelectedDate'; date: DateTime }
  | { type: 'setHoveredDate'; date: DateTime }
  | { type: 'setSelectedHour'; hour: number }
  | { type: 'setSelectedMinute'; minute: number }
  | { type: 'setFocusedHour'; hour: number }
  | { type: 'setFocusedMinute'; minute: number }
  | { type: 'clear' }
  | { type: 'toggle' }
  | { type: 'open' }
  | { type: 'close' };
