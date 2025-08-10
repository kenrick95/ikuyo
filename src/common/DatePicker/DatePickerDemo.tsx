import { useState } from 'react';
import { DatePicker } from './DatePicker';

export function DatePickerDemo() {
  const [singleDate, setSingleDate] = useState('');
  const [dateRange, setDateRange] = useState('');

  return (
    <div style={{ padding: '2rem', maxWidth: '600px' }}>
      <h2>DatePicker Demo</h2>

      <div style={{ marginBottom: '2rem' }}>
        <h3>Single Date Picker</h3>
        <DatePicker
          mode="single"
          value={singleDate}
          onChange={setSingleDate}
          placeholder="Select a date"
        />
        <p>Selected date: {singleDate || 'None'}</p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3>Date Range Picker</h3>
        <DatePicker
          mode="range"
          value={dateRange}
          onChange={setDateRange}
          placeholder="Select date range"
        />
        <p>Selected range: {dateRange || 'None'}</p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3>Date Picker with Constraints</h3>
        <DatePicker
          mode="single"
          value={singleDate}
          onChange={setSingleDate}
          min="2024-01-01"
          max="2024-12-31"
          placeholder="Select a date in 2024"
          isDateDisallowed={(date) =>
            date.getDay() === 0 || date.getDay() === 6
          } // Disable weekends
        />
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3>Multiple Months</h3>
        <DatePicker
          mode="range"
          value={dateRange}
          onChange={setDateRange}
          months={2}
          placeholder="Select range (2 months view)"
        />
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3>Custom Locale and Week Start</h3>
        <DatePicker
          mode="single"
          value={singleDate}
          onChange={setSingleDate}
          locale="de-DE"
          firstDayOfWeek={1} // Monday
          formatWeekday="short"
          placeholder="German locale, Monday first"
        />
      </div>
    </div>
  );
}
