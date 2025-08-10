import { DateTime } from 'luxon';
import { useState } from 'react';
import { DateTimePicker } from './common/DatePicker2/DateTimePicker';

const today = DateTime.fromISO('2025-06-07T09:10:00Z');
const min = today.plus({ months: -1 });
const max = today.plus({ months: 1 });

export default function PageDemo() {
  const [value, setValue] = useState<DateTime | undefined>(today);
  const [value2, setValue2] = useState<DateTime | undefined>(today);
  const [value3, setValue3] = useState<DateTime | undefined>(today);
  const [value4, setValue4] = useState<DateTime | undefined>(today);
  return (
    <div>
      <div>
        Date
        <DateTimePicker
          value={value}
          mode="date"
          onChange={setValue}
          min={min}
          max={max}
        />
      </div>
      <div>
        Date clearable
        <DateTimePicker
          value={value2}
          mode="date"
          clearable={true}
          onChange={setValue2}
          min={min}
          max={max}
        />
      </div>
      <div>
        Date time
        <DateTimePicker
          value={value3}
          mode="datetime"
          onChange={setValue3}
          min={min}
          max={max}
        />
      </div>
      <div>
        Date time clearable
        <DateTimePicker
          value={value4}
          mode="datetime"
          clearable={true}
          onChange={setValue4}
          min={min}
          max={max}
        />
      </div>
    </div>
  );
}
