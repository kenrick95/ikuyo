import { DateTime } from 'luxon';
import { CalendarMonth, DatePickerMode } from './common/DatePicker2/DatePicker';

export default function PageDemo() {
  return (
    <div>
      <CalendarMonth yearMonth={DateTime.now()} mode={DatePickerMode.Single} />
    </div>
  );
}
