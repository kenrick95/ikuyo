// Quick test to verify DatePicker imports and basic functionality
import { DatePicker } from './DatePicker';

export function QuickTest() {
  return (
    <div>
      <DatePicker
        mode="single"
        value=""
        onChange={() => {}}
        placeholder="Test picker"
      />
    </div>
  );
}
