import { useState } from 'react';
import { DateTimePicker } from './common/DatePicker2/DateTimePicker';

const todayDate = Temporal.PlainDate.from('2025-06-07T09:10:00');
const todayDateTime = Temporal.PlainDateTime.from('2025-06-07T09:10:00');
const min = todayDate.add({ months: -1 });
const max = todayDate.add({ months: 1 });

export default function PageDemo() {
  const [value, setValue] = useState<
    Temporal.PlainDate | Temporal.PlainDateTime | undefined
  >(todayDate);
  const [value2, setValue2] = useState<
    Temporal.PlainDate | Temporal.PlainDateTime | undefined
  >(todayDate);
  const [value3, setValue3] = useState<
    Temporal.PlainDate | Temporal.PlainDateTime | undefined
  >(todayDateTime);
  const [value4, setValue4] = useState<
    Temporal.PlainDate | Temporal.PlainDateTime | undefined
  >(todayDateTime);
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
