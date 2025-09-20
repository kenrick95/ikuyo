# DatePicker Component

A comprehensive, accessible React DatePicker component based on the 'cally' library. Supports both single date selection and date range selection with full keyboard navigation and accessibility features.

## Features

- **Single Date Selection**: Pick individual dates
- **Date Range Selection**: Select start and end dates
- **Accessibility**: Full keyboard navigation, screen reader support, ARIA attributes
- **Customizable**: Locale support, custom date constraints, weekend highlighting
- **Responsive**: Works well on mobile and desktop
- **Lightweight**: No external date libraries required (uses built-in Intl API)

## Basic Usage

```tsx
import { DatePicker } from './common/DatePicker';

// Single date picker
function SingleDateExample() {
  const [date, setDate] = useState('');
  
  return (
    <DatePicker
      mode="single"
      value={date}
      onChange={setDate}
      placeholder="Select a date"
    />
  );
}

// Date range picker
function DateRangeExample() {
  const [range, setRange] = useState('');
  
  return (
    <DatePicker
      mode="range"
      value={range}
      onChange={setRange}
      placeholder="Select date range"
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `''` | Selected date(s) - ISO string for single mode, "start/end" for range mode |
| `mode` | `'single' \| 'range'` | `'single'` | Calendar mode |
| `onChange` | `(value: string) => void` | - | Callback when date selection changes |
| `min` | `string` | - | Minimum selectable date (ISO string) |
| `max` | `string` | - | Maximum selectable date (ISO string) |
| `placeholder` | `string` | - | Placeholder text |
| `disabled` | `boolean` | `false` | Whether the picker is disabled |
| `className` | `string` | - | Custom CSS class |
| `firstDayOfWeek` | `0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6` | `1` | First day of week (0 = Sunday, 1 = Monday) |
| `isDateDisallowed` | `(date: Date) => boolean` | - | Function to determine if a date should be disabled |
| `locale` | `string` | - | Locale for date formatting |
| `formatWeekday` | `'narrow' \| 'short' \| 'long'` | `'narrow'` | Format for weekday display |
| `showOutsideDays` | `boolean` | `false` | Whether to show dates from adjacent months |
| `months` | `number` | `1` | Number of months to display |

## Advanced Examples

### Date Constraints

```tsx
<DatePicker
  mode="single"
  value={date}
  onChange={setDate}
  min="2024-01-01"
  max="2024-12-31"
  isDateDisallowed={(date) => {
    // Disable weekends
    return date.getDay() === 0 || date.getDay() === 6;
  }}
/>
```

### Multiple Months

```tsx
<DatePicker
  mode="range"
  value={range}
  onChange={setRange}
  months={2}
  showOutsideDays={true}
/>
```

### Custom Locale

```tsx
<DatePicker
  mode="single"
  value={date}
  onChange={setDate}
  locale="de-DE"
  firstDayOfWeek={1}
  formatWeekday="short"
/>
```

## Accessibility

The DatePicker component is fully accessible:

- **Keyboard Navigation**: Arrow keys for date navigation, Page Up/Down for month/year navigation
- **ARIA Support**: Proper ARIA labels, roles, and states
- **Screen Reader Support**: Announces date changes and selections
- **Focus Management**: Maintains focus within the calendar when open
- **High Contrast**: Works with high contrast themes

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Arrow Keys` | Navigate between dates |
| `Page Up/Down` | Navigate months (with Shift: years) |
| `Home/End` | Go to start/end of week |
| `Enter/Space` | Select date or toggle calendar |
| `Escape` | Close calendar |

## Styling

The component uses CSS Modules for styling. You can override styles by targeting the CSS classes:

```css
/* Custom styles */
.datePicker .selectedDates {
  border-color: #your-color;
}

.datePicker .dayButton.selected {
  background-color: #your-accent-color;
}
```

## Integration with Forms

```tsx
import { Controller } from 'react-hook-form';

<Controller
  name="birthDate"
  control={control}
  rules={{ required: 'Date is required' }}
  render={({ field, fieldState }) => (
    <div>
      <DatePicker
        mode="single"
        value={field.value}
        onChange={field.onChange}
        placeholder="Select birth date"
      />
      {fieldState.error && (
        <span className="error">{fieldState.error.message}</span>
      )}
    </div>
  )}
/>
```

## Comparison with DateRangePicker

This DatePicker component is designed to replace and extend the existing DateRangePicker component:

- **Unified API**: Single component handles both single dates and ranges
- **Better Accessibility**: Enhanced keyboard navigation and ARIA support
- **More Flexible**: Configurable months, locales, and constraints
- **Consistent Styling**: Uses the same design system
- **Drop-in Replacement**: Similar props for easy migration

## Browser Support

- Modern browsers with ES2018+ support
- Intl.DateTimeFormat API (widely supported)
- CSS Grid and Flexbox support

## Implementation Notes

The component uses a custom temporal polyfill that implements a subset of the TC39 Temporal API for reliable date handling without external dependencies. This ensures consistent behavior across different environments and time zones.
