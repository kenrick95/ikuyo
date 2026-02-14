import { Button, Flex, Text, TextField } from '@radix-ui/themes';
import type { ChangeEvent, FocusEvent, KeyboardEvent, MouseEvent } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './EmojiTextField.module.css';
import type { EmojiCategorySection, EmojiOption } from './emojiData';
import {
  buildEmojiGridPositions,
  filterEmojisByQuery,
  findVerticalNeighbor,
} from './emojiData';

function EmojiPickerGridInner({
  icon,
  listboxId,
  clearable,
  onSelect,
  onClear,
}: {
  icon: string;
  listboxId: string;
  clearable?: boolean;
  onSelect: (unicode: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const pickerContainerRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const { sections: categorySections, flat: filteredEmojis } = useMemo(
    () => filterEmojisByQuery(query),
    [query],
  );

  const filteredEmojisRef = useRef(filteredEmojis);
  filteredEmojisRef.current = filteredEmojis;

  const selectedEmojiIndex = useMemo(() => {
    if (!icon) {
      return -1;
    }
    return filteredEmojis.findIndex((emoji) => emoji.unicode === icon);
  }, [filteredEmojis, icon]);

  const activeEmojiId = useMemo(() => {
    if (activeIndex < 0) {
      return '';
    }
    return filteredEmojis[activeIndex]?.id ?? '';
  }, [activeIndex, filteredEmojis]);

  const filteredEmojiIndexById = useMemo(() => {
    return new Map(filteredEmojis.map((emoji, index) => [emoji.id, index]));
  }, [filteredEmojis]);

  const emojiGridPositions = useMemo(
    () => buildEmojiGridPositions(categorySections, filteredEmojiIndexById),
    [categorySections, filteredEmojiIndexById],
  );

  // Reset active index when filtered results change
  useEffect(() => {
    optionRefs.current = optionRefs.current.slice(0, filteredEmojis.length);
    setActiveIndex((prev) => {
      if (filteredEmojis.length === 0) {
        return -1;
      }
      if (selectedEmojiIndex >= 0) {
        return selectedEmojiIndex;
      }
      if (prev < 0) {
        return 0;
      }
      return Math.min(prev, filteredEmojis.length - 1);
    });
  }, [filteredEmojis.length, selectedEmojiIndex]);

  // Focus input on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  // Scroll active option into view
  useEffect(() => {
    if (activeIndex < 0 || !activeEmojiId) {
      return;
    }
    requestAnimationFrame(() => {
      const container = pickerContainerRef.current;
      const option = optionRefs.current[activeIndex];
      if (!container || !option) {
        return;
      }

      const padding = 4;
      const containerRect = container.getBoundingClientRect();
      const optionRect = option.getBoundingClientRect();

      if (optionRect.top < containerRect.top + padding) {
        container.scrollTop -= containerRect.top + padding - optionRect.top;
        return;
      }

      if (optionRect.bottom > containerRect.bottom - padding) {
        container.scrollTop +=
          optionRect.bottom - (containerRect.bottom - padding);
      }
    });
  }, [activeEmojiId, activeIndex]);

  const getOptionIndex = useCallback((element: HTMLButtonElement) => {
    const raw = element.dataset.emojiIndex;
    if (raw === undefined) {
      return -1;
    }
    const parsed = Number(raw);
    return Number.isInteger(parsed) ? parsed : -1;
  }, []);

  const focusOption = useCallback((index: number) => {
    optionRefs.current[index]?.focus();
  }, []);

  const findVerticalIndex = useCallback(
    (currentIndex: number, direction: -1 | 1) =>
      findVerticalNeighbor(currentIndex, direction, emojiGridPositions),
    [emojiGridPositions],
  );

  const moveActiveVertical = useCallback(
    (direction: -1 | 1) => {
      if (filteredEmojis.length === 0) {
        setActiveIndex(-1);
        return;
      }
      setActiveIndex((prev) => {
        if (prev < 0) {
          return 0;
        }
        return findVerticalIndex(prev, direction);
      });
    },
    [filteredEmojis.length, findVerticalIndex],
  );

  const moveActive = useCallback(
    (delta: number) => {
      if (filteredEmojis.length === 0) {
        setActiveIndex(-1);
        return;
      }
      setActiveIndex((prev) => {
        if (prev < 0) {
          return 0;
        }
        return (prev + delta + filteredEmojis.length) % filteredEmojis.length;
      });
    },
    [filteredEmojis.length],
  );

  const onSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.currentTarget.value);
  }, []);

  const onSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveActiveVertical(1);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveActiveVertical(-1);
        return;
      }

      if (event.key === 'ArrowRight') {
        const emojis = filteredEmojisRef.current;
        if (emojis.length === 0 || activeIndex >= emojis.length - 1) {
          return;
        }
        event.preventDefault();
        moveActive(1);
        return;
      }

      if (event.key === 'ArrowLeft') {
        const emojis = filteredEmojisRef.current;
        if (emojis.length === 0 || activeIndex <= 0) {
          return;
        }
        event.preventDefault();
        moveActive(-1);
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        const emojis = filteredEmojisRef.current;
        setActiveIndex(emojis.length > 0 ? 0 : -1);
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        const emojis = filteredEmojisRef.current;
        setActiveIndex(emojis.length > 0 ? emojis.length - 1 : -1);
        return;
      }

      if (event.key === 'Enter') {
        const emojis = filteredEmojisRef.current;
        if (emojis.length === 0) {
          return;
        }
        event.preventDefault();
        const indexToSelect = activeIndex >= 0 ? activeIndex : 0;
        const emoji = emojis[indexToSelect];
        if (emoji) {
          onSelect(emoji.unicode);
        }
        return;
      }

      if (event.key === 'Tab' && !event.shiftKey) {
        const emojis = filteredEmojisRef.current;
        if (emojis.length === 0) {
          return;
        }
        event.preventDefault();
        const indexToFocus = activeIndex >= 0 ? activeIndex : 0;
        setActiveIndex(indexToFocus);
        requestAnimationFrame(() => {
          focusOption(indexToFocus);
        });
      }
    },
    [activeIndex, focusOption, moveActive, moveActiveVertical, onSelect],
  );

  const onOptionKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const emojis = filteredEmojisRef.current;
      if (emojis.length === 0) {
        return;
      }

      const focusAndActivate = (nextIndex: number) => {
        setActiveIndex(nextIndex);
        requestAnimationFrame(() => {
          focusOption(nextIndex);
        });
      };

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        focusAndActivate((index + 1 + emojis.length) % emojis.length);
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        focusAndActivate((index - 1 + emojis.length) % emojis.length);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        focusAndActivate(findVerticalIndex(index, 1));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        focusAndActivate(findVerticalIndex(index, -1));
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        focusAndActivate(0);
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        focusAndActivate(emojis.length - 1);
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const emoji = emojis[index];
        if (emoji) {
          onSelect(emoji.unicode);
        }
      }
    },
    [findVerticalIndex, focusOption, onSelect],
  );

  const onOptionListKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const index = getOptionIndex(event.currentTarget);
      if (index >= 0) {
        onOptionKeyDown(event, index);
      }
    },
    [getOptionIndex, onOptionKeyDown],
  );

  const onOptionMouseDown = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
    },
    [],
  );

  const onOptionMouseEnter = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const index = getOptionIndex(event.currentTarget);
      if (index >= 0) {
        setActiveIndex(index);
      }
    },
    [getOptionIndex],
  );

  const onOptionFocus = useCallback(
    (event: FocusEvent<HTMLButtonElement>) => {
      const index = getOptionIndex(event.currentTarget);
      if (index >= 0) {
        setActiveIndex(index);
      }
    },
    [getOptionIndex],
  );

  const onOptionClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const selectedIcon = event.currentTarget.dataset.emojiUnicode;
      if (selectedIcon) {
        onSelect(selectedIcon);
      }
    },
    [onSelect],
  );

  const setOptionRef = useCallback(
    (index: number, element: HTMLButtonElement | null) => {
      optionRefs.current[index] = element;
    },
    [],
  );

  return (
    <Flex direction="column" gap="2">
      <Flex align="center" justify="between">
        <Text size="1" color="gray">
          Pick icon
        </Text>
        {clearable ? (
          <Button
            type="button"
            variant="ghost"
            color="gray"
            size="1"
            onClick={onClear}
            disabled={!icon}
          >
            Clear
          </Button>
        ) : null}
      </Flex>

      <TextField.Root
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="Search emoji"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={true}
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
        }
        placeholder="Search emoji"
        value={query}
        onChange={onSearchChange}
        onKeyDown={onSearchKeyDown}
      />

      <Text size="1" color="gray" className={s.srOnly}>
        When search results are available, use arrow keys to navigate and Enter
        to choose.
      </Text>

      <div
        ref={pickerContainerRef}
        id={listboxId}
        role="listbox"
        aria-label="Search results"
        className={s.pickerContainer}
      >
        {categorySections.map((section) => (
          <EmojiCategorySectionRow
            key={section.id}
            section={section}
            listboxId={listboxId}
            activeIndex={activeIndex}
            icon={icon}
            filteredEmojiIndexById={filteredEmojiIndexById}
            setOptionRef={setOptionRef}
            onOptionMouseDown={onOptionMouseDown}
            onOptionMouseEnter={onOptionMouseEnter}
            onOptionFocus={onOptionFocus}
            onOptionKeyDown={onOptionListKeyDown}
            onOptionClick={onOptionClick}
          />
        ))}

        {filteredEmojis.length === 0 ? (
          <Text size="1" color="gray" className={s.emptyState}>
            No emoji found
          </Text>
        ) : null}
      </div>
    </Flex>
  );
}

export const EmojiPickerGrid = memo(EmojiPickerGridInner);

function EmojiCategorySectionRowInner({
  section,
  listboxId,
  activeIndex,
  icon,
  filteredEmojiIndexById,
  setOptionRef,
  onOptionMouseDown,
  onOptionMouseEnter,
  onOptionFocus,
  onOptionKeyDown,
  onOptionClick,
}: {
  section: EmojiCategorySection;
  listboxId: string;
  activeIndex: number;
  icon: string;
  filteredEmojiIndexById: Map<string, number>;
  setOptionRef: (index: number, element: HTMLButtonElement | null) => void;
  onOptionMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
  onOptionMouseEnter: (event: MouseEvent<HTMLButtonElement>) => void;
  onOptionFocus: (event: FocusEvent<HTMLButtonElement>) => void;
  onOptionKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onOptionClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <section className={s.categorySection}>
      <div className={s.categoryHeader}>
        <span aria-hidden="true">{section.icon}</span>
        <Text size="1" weight="medium" color="gray">
          {section.label}
        </Text>
      </div>
      <div className={s.pickerGrid}>
        {section.emojis.map((emoji) => {
          const index = filteredEmojiIndexById.get(emoji.id) ?? -1;
          if (index < 0) {
            return null;
          }
          return (
            <EmojiButton
              key={emoji.id}
              emoji={emoji}
              index={index}
              listboxId={listboxId}
              isActive={index === activeIndex}
              isSelected={emoji.unicode === icon}
              setOptionRef={setOptionRef}
              onMouseDown={onOptionMouseDown}
              onMouseEnter={onOptionMouseEnter}
              onFocus={onOptionFocus}
              onKeyDown={onOptionKeyDown}
              onClick={onOptionClick}
            />
          );
        })}
      </div>
    </section>
  );
}

const EmojiCategorySectionRow = memo(EmojiCategorySectionRowInner);

function EmojiButtonInner({
  emoji,
  index,
  listboxId,
  isActive,
  isSelected,
  setOptionRef,
  onMouseDown,
  onMouseEnter,
  onFocus,
  onKeyDown,
  onClick,
}: {
  emoji: EmojiOption;
  index: number;
  listboxId: string;
  isActive: boolean;
  isSelected: boolean;
  setOptionRef: (index: number, element: HTMLButtonElement | null) => void;
  onMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
  onMouseEnter: (event: MouseEvent<HTMLButtonElement>) => void;
  onFocus: (event: FocusEvent<HTMLButtonElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const buttonClassName = [
    s.emojiButton,
    isSelected ? s.emojiButtonSelected : '',
    isActive ? s.emojiButtonActive : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      id={`${listboxId}-opt-${index}`}
      data-emoji-index={index}
      data-emoji-unicode={emoji.unicode}
      ref={(element) => {
        setOptionRef(index, element);
      }}
      type="button"
      tabIndex={isActive ? 0 : -1}
      role="option"
      aria-selected={isSelected}
      aria-label={`${emoji.unicode} ${emoji.annotation}`}
      className={buttonClassName}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      onClick={onClick}
    >
      <span className={s.emojiChar}>{emoji.unicode}</span>
    </button>
  );
}

const EmojiButton = memo(EmojiButtonInner);
