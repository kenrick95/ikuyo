import { ChevronDownIcon, Cross1Icon } from '@radix-ui/react-icons';
import { Badge, Flex, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import type React from 'react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import s from './MultiSelectAutocomplete.module.css';

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectAutocompleteProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxDisplayedOptions?: number;
  className?: string;
  filterFunction?: (option: MultiSelectOption, query: string) => boolean;
}

const defaultFilterFunction = (option: MultiSelectOption, query: string) =>
  option.label.toLowerCase().includes(query.toLowerCase()) ||
  option.value.toLowerCase().includes(query.toLowerCase());

export function MultiSelectAutocomplete({
  options,
  value,
  onChange,
  placeholder = 'Select options...',
  disabled = false,
  maxDisplayedOptions = 50,
  className,
  filterFunction = defaultFilterFunction,
}: MultiSelectAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLElement | null)[]>([]);

  const id = useId();

  // Filter options based on query and exclude already selected values
  const filteredOptions = useMemo(() => {
    const filtered = options.filter(
      (option) =>
        !value.includes(option.value) &&
        (query === '' || filterFunction(option, query)),
    );
    return filtered.slice(0, maxDisplayedOptions);
  }, [options, value, query, filterFunction, maxDisplayedOptions]);

  // Get selected option labels
  const selectedOptions = useMemo(() => {
    return value
      .map((val) => options.find((opt) => opt.value === val))
      .filter(Boolean) as MultiSelectOption[];
  }, [value, options]);

  // Handle option selection
  const handleSelectOption = useCallback(
    (optionValue: string) => {
      if (!value.includes(optionValue)) {
        onChange([...value, optionValue]);
      }
      setQuery('');
      setFocusedIndex(-1);
      inputRef.current?.focus();
    },
    [value, onChange],
  );

  // Handle option removal
  const handleRemoveOption = useCallback(
    (optionValue: string) => {
      onChange(value.filter((val) => val !== optionValue));
    },
    [value, onChange],
  );
  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setFocusedIndex((prev) =>
              prev < filteredOptions.length - 1 ? prev + 1 : 0,
            );
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (isOpen) {
            setFocusedIndex((prev) =>
              prev > 0 ? prev - 1 : filteredOptions.length - 1,
            );
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (isOpen && focusedIndex >= 0 && filteredOptions[focusedIndex]) {
            handleSelectOption(filteredOptions[focusedIndex].value);
          } else if (!isOpen) {
            setIsOpen(true);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
          setQuery('');
          break;
        case 'Backspace':
          if (query === '' && value.length > 0) {
            handleRemoveOption(value[value.length - 1]);
          }
          break;
        case 'Tab':
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
      }
    },
    [
      disabled,
      isOpen,
      focusedIndex,
      filteredOptions,
      handleSelectOption,
      query,
      value,
      handleRemoveOption,
    ],
  );

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  // Scroll focused option into view
  useEffect(() => {
    if (focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      const element = optionRefs.current[focusedIndex];
      if (element && typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({
          block: 'nearest',
        });
      }
    }
  }, [focusedIndex]);

  // Update option refs array when filtered options change
  useEffect(() => {
    optionRefs.current = optionRefs.current.slice(0, filteredOptions.length);
  }, [filteredOptions.length]);
  const handleTriggerClick = useCallback(() => {
    if (!disabled) {
      if (!isOpen) {
        setIsOpen(true);
        inputRef.current?.focus();
      }
    }
  }, [disabled, isOpen]);

  const handleTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleTriggerClick();
      }
    },
    [handleTriggerClick],
  );
  return (
    <div
      ref={containerRef}
      className={clsx(s.container, className)}
      data-disabled={disabled}
    >
      <div
        className={s.trigger}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        tabIndex={disabled ? -1 : 0}
        // biome-ignore lint/a11y/useSemanticElements: Not a <button> here because <button> cannot contain another <button> as it's used in the badge remove button
        role="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby={`${id}-label`}
        aria-disabled={disabled}
      >
        <Flex wrap="wrap" gap="1" align="center" className={s.content}>
          {selectedOptions.map((option) => (
            <Badge
              key={option.value}
              variant="outline"
              color="gray"
              size="1"
              className={s.selectedBadge}
            >
              <Text size="1" highContrast>
                {option.label}
              </Text>
              {!disabled && (
                <button
                  type="button"
                  className={s.removeBadgeButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveOption(option.value);
                  }}
                  aria-label={`Remove ${option.label}`}
                >
                  <Cross1Icon width={10} height={10} />
                </button>
              )}
            </Badge>
          ))}
          <div className={s.inputContainer}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setQuery(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (!disabled && !isOpen) {
                  setIsOpen(true);
                }
              }}
              placeholder={selectedOptions.length === 0 ? placeholder : ''}
              disabled={disabled}
              className={s.input}
              autoComplete="off"
              role="combobox"
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              aria-labelledby={`${id}-label`}
              aria-controls={isOpen ? `${id}-listbox` : undefined}
            />
          </div>
        </Flex>
        <ChevronDownIcon className={clsx(s.chevron, isOpen && s.chevronOpen)} />
      </div>
      {isOpen && !disabled && (
        <div ref={dropdownRef} className={s.dropdown} data-testid="dropdown">
          {filteredOptions.length > 0 ? (
            <div className={s.optionsList} id={`${id}-listbox`}>
              {filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  ref={(el) => {
                    optionRefs.current[index] = el;
                  }}
                  className={clsx(
                    s.option,
                    index === focusedIndex && s.optionFocused,
                  )}
                  onClick={() => handleSelectOption(option.value)}
                  tabIndex={-1}
                  data-focused={index === focusedIndex}
                  data-testid={`option-${option.value}`}
                >
                  <Text size="2">{option.label}</Text>
                </button>
              ))}
            </div>
          ) : (
            <div className={s.noOptions}>
              <Text size="2" color="gray">
                {query ? 'No matching options' : 'No more options available'}
              </Text>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
