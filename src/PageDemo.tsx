import { DateTime } from 'luxon';
import { useState } from 'react';
import { CalendarMonth, DatePickerMode } from './common/DatePicker2/DatePicker';

export default function PageDemo() {
  const [selectedDate, setSelectedDate] = useState<DateTime>(DateTime.now());
  return (
    <div>
      <CalendarMonth
        yearMonth={selectedDate}
        mode={DatePickerMode.Single}
        onSelectDay={setSelectedDate}
      />
    </div>
  );
}
