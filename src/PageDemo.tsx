import { DateTime } from 'luxon';
import { DatePicker, DatePickerMode } from './common/DatePicker2/DatePicker';

export default function PageDemo() {
  const today = DateTime.now();
  return (
    <div>
      <DatePicker
        mode={DatePickerMode.Single}
        value={today}
        onChange={(val) => console.log(val)}
        min={today.minus({ years: 1 })}
        max={today.plus({ years: 1 })}
      />
    </div>
  );
}
