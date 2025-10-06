import { Select } from '@radix-ui/themes';
import { memo } from 'react';
import { ALL_TIMEZONES } from '../../data/intl/timezones';

function TimeZoneSelectInner({
  name,
  id,
  value,
  handleChange,
  isFormLoading,
}: {
  name: string;
  id: string;
  value: string;
  handleChange?: (newValue: string) => void;
  isFormLoading: boolean;
}) {
  return (
    <Select.Root
      name={name}
      value={value}
      onValueChange={handleChange}
      required
      disabled={isFormLoading}
    >
      <Select.Trigger id={id} />
      <Select.Content>
        {ALL_TIMEZONES.map((tz) => {
          return (
            <Select.Item key={tz} value={tz}>
              {tz}
            </Select.Item>
          );
        })}
      </Select.Content>
    </Select.Root>
  );
}
export const TimeZoneSelect = memo(
  TimeZoneSelectInner,
  (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.isFormLoading === nextProps.isFormLoading &&
      prevProps.handleChange === nextProps.handleChange &&
      prevProps.id === nextProps.id &&
      prevProps.name === nextProps.name
    );
  },
);
