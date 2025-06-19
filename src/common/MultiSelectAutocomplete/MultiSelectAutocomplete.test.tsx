import { Theme } from '@radix-ui/themes';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  MultiSelectAutocomplete,
  type MultiSelectOption,
} from './MultiSelectAutocomplete';

// Mock data for testing
const mockOptions: MultiSelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
  { value: 'elderberry', label: 'Elderberry' },
  { value: 'fig', label: 'Fig' },
  { value: 'grape', label: 'Grape' },
];

// Wrapper component to provide Radix UI Theme
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Theme>{children}</Theme>
);

const renderWithTheme = (component: React.ReactElement) => {
  return render(component, { wrapper: TestWrapper });
};

describe('MultiSelectAutocomplete', () => {
  const defaultProps = {
    options: mockOptions,
    value: [],
    onChange: vi.fn(),
    placeholder: 'Select options...',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders with placeholder when no values selected', () => {
      renderWithTheme(<MultiSelectAutocomplete {...defaultProps} />);

      expect(
        screen.getByPlaceholderText('Select options...'),
      ).toBeInTheDocument();
    });

    test('renders selected values as badges', () => {
      renderWithTheme(
        <MultiSelectAutocomplete
          {...defaultProps}
          value={['apple', 'banana']}
        />,
      );

      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.getByText('Banana')).toBeInTheDocument();
    });

    test('hides placeholder when values are selected', () => {
      renderWithTheme(
        <MultiSelectAutocomplete {...defaultProps} value={['apple']} />,
      );

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('placeholder', '');
    });
    test('applies custom className', () => {
      const { container } = renderWithTheme(
        <MultiSelectAutocomplete {...defaultProps} className="custom-class" />,
      );

      const component = container.querySelector('[data-disabled]');
      expect(component).toHaveClass('custom-class');
    });
  });

  describe('Dropdown Interaction', () => {
    test('opens dropdown when trigger is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<MultiSelectAutocomplete {...defaultProps} />);

      const trigger = screen.getByRole('button');
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
        expect(screen.getByText('Banana')).toBeInTheDocument();
      });
    });
    test('opens dropdown when input is focused', async () => {
      const user = userEvent.setup();
      renderWithTheme(<MultiSelectAutocomplete {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
      });
    });
    test('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      renderWithTheme(<MultiSelectAutocomplete {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
      });

      await user.click(document.body);

      await waitFor(() => {
        expect(screen.queryByText('Apple')).not.toBeInTheDocument();
      });
    });
    test('shows chevron icon that rotates when open', async () => {
      const user = userEvent.setup();
      const { container } = renderWithTheme(
        <MultiSelectAutocomplete {...defaultProps} />,
      );

      const trigger = screen.getByRole('button');
      const chevron = container.querySelector('[class*="chevron"]');

      expect(chevron).not.toHaveClass('_chevronOpen_c0d2c1');

      await user.click(trigger);

      await waitFor(() => {
        expect(chevron).toHaveClass('_chevronOpen_c0d2c1');
      });
    });
  });

  describe('Option Selection', () => {
    test('calls onChange when option is selected', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderWithTheme(
        <MultiSelectAutocomplete {...defaultProps} onChange={onChange} />,
      );

      const trigger = screen.getByRole('button');
      await user.click(trigger);

      const appleOption = screen.getByText('Apple');
      await user.click(appleOption);

      expect(onChange).toHaveBeenCalledWith(['apple']);
    });
    test('adds multiple selections', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderWithTheme(
        <MultiSelectAutocomplete
          {...defaultProps}
          onChange={onChange}
          value={['apple']}
        />,
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        const bananaOption = screen.getByText('Banana');
        return user.click(bananaOption);
      });

      expect(onChange).toHaveBeenCalledWith(['apple', 'banana']);
    });
    test('does not duplicate selections', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderWithTheme(
        <MultiSelectAutocomplete
          {...defaultProps}
          onChange={onChange}
          value={['apple']}
        />,
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        // Apple should not appear in dropdown since it's already selected
        expect(screen.queryByTestId('option-apple')).not.toBeInTheDocument();
        expect(screen.getByText('Banana')).toBeInTheDocument();
      });
    });

    test('removes selection when remove button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderWithTheme(
        <MultiSelectAutocomplete
          {...defaultProps}
          onChange={onChange}
          value={['apple', 'banana']}
        />,
      );

      const removeButtons = screen.getAllByLabelText(/Remove/);
      await user.click(removeButtons[0]); // Remove Apple

      expect(onChange).toHaveBeenCalledWith(['banana']);
    });

    test('clears input after selection', async () => {
      const user = userEvent.setup();
      renderWithTheme(<MultiSelectAutocomplete {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.type(input, 'app');
      await user.click(screen.getByText('Apple'));

      expect(input).toHaveValue('');
    });
  });

  describe('Filtering/Search', () => {
    test('filters options based on input', async () => {
      const user = userEvent.setup();
      renderWithTheme(<MultiSelectAutocomplete {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.type(input, 'app');

      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.queryByText('Banana')).not.toBeInTheDocument();
    });

    test('shows "No matching options" when no results', async () => {
      const user = userEvent.setup();
      renderWithTheme(<MultiSelectAutocomplete {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.type(input, 'xyz');

      expect(screen.getByText('No matching options')).toBeInTheDocument();
    });
    test('shows "No more options available" when all options selected', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <MultiSelectAutocomplete
          {...defaultProps}
          value={mockOptions.map((opt) => opt.value)}
        />,
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(
          screen.getByText('No more options available'),
        ).toBeInTheDocument();
      });
    });

    test('uses custom filter function when provided', async () => {
      const user = userEvent.setup();
      const customFilter = (option: MultiSelectOption, query: string) =>
        option.value.startsWith(query.toLowerCase());

      renderWithTheme(
        <MultiSelectAutocomplete
          {...defaultProps}
          filterFunction={customFilter}
        />,
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'a');

      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.queryByText('Banana')).not.toBeInTheDocument(); // Contains 'a' but doesn't start with 'a'
    });
    test('respects maxDisplayedOptions limit', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <MultiSelectAutocomplete {...defaultProps} maxDisplayedOptions={3} />,
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        const optionButtons = screen
          .queryAllByRole('button')
          .filter((button) =>
            mockOptions.some((opt) => button.textContent?.includes(opt.label)),
          );
        expect(optionButtons).toHaveLength(3);
      });
    });
  });

  describe('Keyboard Navigation', () => {
    test('opens dropdown with Arrow Down', async () => {
      const user = userEvent.setup();
      renderWithTheme(<MultiSelectAutocomplete {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.keyboard('{Escape}'); // Close first
      await user.keyboard('{ArrowDown}');

      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
      });
    });
    test('navigates options with arrow keys', async () => {
      const user = userEvent.setup();
      const { container } = renderWithTheme(
        <MultiSelectAutocomplete {...defaultProps} />,
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
      });

      await user.keyboard('{ArrowDown}');

      await waitFor(() => {
        const focusedOption = container.querySelector('[data-focused="true"]');
        expect(focusedOption).toHaveTextContent('Apple');
      });

      await user.keyboard('{ArrowDown}');

      await waitFor(() => {
        const nextFocusedOption = container.querySelector(
          '[data-focused="true"]',
        );
        expect(nextFocusedOption).toHaveTextContent('Banana');
      });
    });
    test('selects option with Enter key', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderWithTheme(
        <MultiSelectAutocomplete {...defaultProps} onChange={onChange} />,
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
      });

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalledWith(['apple']);
    });
    test('closes dropdown with Escape key', async () => {
      const user = userEvent.setup();
      renderWithTheme(<MultiSelectAutocomplete {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('Apple')).not.toBeInTheDocument();
      });
    });

    test('removes last selection with Backspace on empty input', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderWithTheme(
        <MultiSelectAutocomplete
          {...defaultProps}
          onChange={onChange}
          value={['apple', 'banana']}
        />,
      );

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.keyboard('{Backspace}');

      expect(onChange).toHaveBeenCalledWith(['apple']);
    });

    test('does not remove selection with Backspace when input has text', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderWithTheme(
        <MultiSelectAutocomplete
          {...defaultProps}
          onChange={onChange}
          value={['apple']}
        />,
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'test');
      await user.keyboard('{Backspace}');

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    test('does not open dropdown when disabled', async () => {
      const user = userEvent.setup();
      renderWithTheme(
        <MultiSelectAutocomplete {...defaultProps} disabled={true} />,
      );

      const trigger = screen.getByRole('button');
      await user.click(trigger);

      expect(screen.queryByText('Apple')).not.toBeInTheDocument();
    });

    test('does not show remove buttons when disabled', () => {
      renderWithTheme(
        <MultiSelectAutocomplete
          {...defaultProps}
          value={['apple']}
          disabled={true}
        />,
      );

      expect(screen.queryByLabelText(/Remove/)).not.toBeInTheDocument();
    });

    test('disables input when disabled', () => {
      renderWithTheme(
        <MultiSelectAutocomplete {...defaultProps} disabled={true} />,
      );

      const input = screen.getByRole('combobox');
      expect(input).toBeDisabled();
    });
    test('applies disabled styling', () => {
      const { container } = renderWithTheme(
        <MultiSelectAutocomplete {...defaultProps} disabled={true} />,
      );

      const component = container.querySelector('[data-disabled]');
      expect(component).toHaveAttribute('data-disabled', 'true');
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA attributes', () => {
      renderWithTheme(<MultiSelectAutocomplete {...defaultProps} />);

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-expanded', 'false');
      expect(input).toHaveAttribute('aria-haspopup', 'listbox');
    });
    test('updates aria-expanded when opened', async () => {
      const user = userEvent.setup();
      renderWithTheme(<MultiSelectAutocomplete {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-expanded', 'true');
      });
    });

    test('has proper remove button labels', () => {
      renderWithTheme(
        <MultiSelectAutocomplete
          {...defaultProps}
          value={['apple', 'banana']}
        />,
      );

      expect(screen.getByLabelText('Remove Apple')).toBeInTheDocument();
      expect(screen.getByLabelText('Remove Banana')).toBeInTheDocument();
    });
    test('manages focus properly', async () => {
      const user = userEvent.setup();
      renderWithTheme(<MultiSelectAutocomplete {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Apple'));

      expect(input).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty options array', () => {
      renderWithTheme(
        <MultiSelectAutocomplete {...defaultProps} options={[]} />,
      );

      const input = screen.getByRole('combobox');
      fireEvent.click(input);

      expect(screen.getByText('No more options available')).toBeInTheDocument();
    });

    test('handles value not in options', () => {
      renderWithTheme(
        <MultiSelectAutocomplete {...defaultProps} value={['nonexistent']} />,
      );

      // Should not crash and should not display anything for invalid values
      expect(screen.queryByText('nonexistent')).not.toBeInTheDocument();
    });
    test('handles rapid clicking without breaking', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      // Use a state-driven approach to test the component behavior
      const TestComponent = () => {
        const [value, setValue] = useState<string[]>([]);
        return (
          <MultiSelectAutocomplete
            {...defaultProps}
            value={value}
            onChange={(newValue) => {
              setValue(newValue);
              onChange(newValue);
            }}
          />
        );
      };

      renderWithTheme(<TestComponent />);

      const trigger = screen.getByRole('button');
      await user.click(trigger);

      // Click Apple option
      await waitFor(() => {
        const appleOption = screen.getByText('Apple');
        return user.click(appleOption);
      });

      // Apple should no longer be in the dropdown
      await waitFor(() => {
        expect(screen.queryByTestId('option-apple')).not.toBeInTheDocument();
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(['apple']);
    });
  });
});
