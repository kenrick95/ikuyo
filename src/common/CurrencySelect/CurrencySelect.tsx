import { Select } from '@radix-ui/themes';
import { memo } from 'react';
import { ALL_CURRENCIES } from '../../data/intl/currencies';

function CurrencySelectInner({
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
        {ALL_CURRENCIES.map((currency) => {
          return (
            <Select.Item key={currency} value={currency}>
              {currency}
            </Select.Item>
          );
        })}
      </Select.Content>
    </Select.Root>
  );
}
export const CurrencySelect = memo(
  CurrencySelectInner,
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
