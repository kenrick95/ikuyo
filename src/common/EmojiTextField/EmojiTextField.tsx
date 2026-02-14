import data from '@emoji-mart/data';
import {
  Button,
  Flex,
  IconButton,
  Popover,
  Text,
  TextField,
} from '@radix-ui/themes';
import type { ChangeEvent, FocusEvent, KeyboardEvent, MouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './EmojiTextField.module.css';

type EmojiMartSkin = {
  native?: string;
};

type EmojiMartEmoji = {
  id: string;
  name: string;
  keywords?: string[];
  skins?: EmojiMartSkin[];
};

type EmojiMartCategory = {
  id: string;
  emojis: string[];
};

type EmojiMartData = {
  categories: EmojiMartCategory[];
  emojis: Record<string, EmojiMartEmoji>;
};

type EmojiOption = {
  id: string;
  unicode: string;
  annotation: string;
  keywords: string[];
  categoryId: string;
};

type EmojiCategorySection = {
  id: string;
  label: string;
  icon: string;
  emojis: EmojiOption[];
};

type EmojiGridPosition = {
  sectionOrder: number;
  row: number;
  col: number;
  absoluteRow: number;
};

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  people: { label: 'Smileys & People', icon: '😀' },
  nature: { label: 'Animals & Nature', icon: '🐻' },
  foods: { label: 'Food & Drink', icon: '🍔' },
  activity: { label: 'Activity', icon: '⚽' },
  places: { label: 'Travel & Places', icon: '✈️' },
  objects: { label: 'Objects', icon: '💡' },
  symbols: { label: 'Symbols', icon: '❤️' },
  flags: { label: 'Flags', icon: '🏁' },
};

const EMOJI_DATA = data as unknown as EmojiMartData;
const EMOJI_COLUMNS = 8;

let _emojiOptionsCache: EmojiOption[] | null = null;

function getEmojiOptions(): EmojiOption[] {
  if (_emojiOptionsCache) {
    return _emojiOptionsCache;
  }

  const options: EmojiOption[] = [];
  const seen = new Set<string>();

  for (const category of EMOJI_DATA.categories) {
    for (const emojiId of category.emojis) {
      if (seen.has(emojiId)) {
        continue;
      }
      seen.add(emojiId);

      const emoji = EMOJI_DATA.emojis[emojiId];
      if (!emoji) {
        continue;
      }

      const unicode = emoji.skins?.[0]?.native;
      if (!unicode) {
        continue;
      }

      options.push({
        id: emoji.id,
        unicode,
        annotation: emoji.name,
        keywords: emoji.keywords ?? [],
        categoryId: category.id,
      });
    }
  }

  _emojiOptionsCache = options;
  return _emojiOptionsCache;
}

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function tokenize(text: string) {
  return normalize(text).split(/\s+/).filter(Boolean);
}

function matchesTokens(emoji: EmojiOption, tokens: string[]) {
  if (tokens.length === 0) {
    return true;
  }
  const haystack = normalize(
    `${emoji.annotation} ${emoji.keywords.join(' ')} ${emoji.unicode} ${emoji.id}`,
  );
  return tokens.every((token) => haystack.includes(token));
}

export function EmojiTextField({
  id,
  name,
  defaultValue,
  placeholder,
  required,
  iconName,
  defaultIcon,
  clearable,
}: {
  id: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  required?: boolean;
  iconName: string;
  defaultIcon?: string | null | undefined;
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [icon, setIcon] = useState(defaultIcon ?? '');
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const pickerContainerRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const getOptionIndex = useCallback((element: HTMLButtonElement) => {
    const raw = element.dataset.emojiIndex;
    if (raw === undefined) {
      return -1;
    }
    const parsed = Number(raw);
    return Number.isInteger(parsed) ? parsed : -1;
  }, []);

  const listboxId = `${id}-emoji-listbox`;

  const categorySections = useMemo<EmojiCategorySection[]>(() => {
    const tokens = tokenize(query);

    const byCategory = new Map<string, EmojiOption[]>();
    for (const emoji of getEmojiOptions()) {
      if (!matchesTokens(emoji, tokens)) {
        continue;
      }
      const list = byCategory.get(emoji.categoryId) ?? [];
      list.push(emoji);
      byCategory.set(emoji.categoryId, list);
    }

    const sections = EMOJI_DATA.categories
      .map((category) => {
        const meta = CATEGORY_META[category.id] ?? {
          label: category.id,
          icon: '🔹',
        };
        return {
          id: category.id,
          label: meta.label,
          icon: meta.icon,
          emojis: byCategory.get(category.id) ?? [],
        } satisfies EmojiCategorySection;
      })
      .filter((section) => section.emojis.length > 0);

    return sections;
  }, [query]);

  const filteredEmojis = useMemo(
    () => categorySections.flatMap((section) => section.emojis),
    [categorySections],
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

  const emojiGridPositions = useMemo<Map<number, EmojiGridPosition>>(() => {
    const positions = new Map<number, EmojiGridPosition>();
    let absoluteRowOffset = 0;

    categorySections.forEach((section, sectionOrder) => {
      section.emojis.forEach((emoji, localIndex) => {
        const index = filteredEmojiIndexById.get(emoji.id);
        if (index === undefined) {
          return;
        }
        positions.set(index, {
          sectionOrder,
          row: Math.floor(localIndex / EMOJI_COLUMNS),
          col: localIndex % EMOJI_COLUMNS,
          absoluteRow:
            absoluteRowOffset + Math.floor(localIndex / EMOJI_COLUMNS),
        });
      });

      absoluteRowOffset += Math.ceil(section.emojis.length / EMOJI_COLUMNS);
    });

    return positions;
  }, [categorySections, filteredEmojiIndexById]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
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
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [filteredEmojis.length, open, selectedEmojiIndex]);

  useEffect(() => {
    if (!open || activeIndex < 0 || !activeEmojiId) {
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
  }, [activeEmojiId, activeIndex, open]);

  useEffect(() => {
    optionRefs.current = optionRefs.current.slice(0, filteredEmojis.length);
    setActiveIndex((prev) => {
      if (filteredEmojis.length === 0) {
        return -1;
      }
      if (prev < 0) {
        return 0;
      }
      return Math.min(prev, filteredEmojis.length - 1);
    });
  }, [filteredEmojis.length]);

  const selectEmoji = useCallback((selectedIcon: string) => {
    setIcon(selectedIcon);
    setOpen(false);
  }, []);

  const clearIcon = useCallback(() => {
    setIcon('');
  }, []);

  const findVerticalIndex = useCallback(
    (currentIndex: number, direction: -1 | 1) => {
      const current = emojiGridPositions.get(currentIndex);
      if (!current) {
        return currentIndex;
      }

      let candidateIndex = currentIndex;
      let bestRowDistance = Number.POSITIVE_INFINITY;
      let bestColumnDistance = Number.POSITIVE_INFINITY;

      for (const [index, position] of emojiGridPositions) {
        if (index === currentIndex) {
          continue;
        }

        const isAhead =
          direction === 1
            ? position.absoluteRow > current.absoluteRow
            : position.absoluteRow < current.absoluteRow;

        if (!isAhead) {
          continue;
        }

        const rowDistance = Math.abs(
          position.absoluteRow - current.absoluteRow,
        );
        const columnDistance = Math.abs(position.col - current.col);

        if (
          rowDistance < bestRowDistance ||
          (rowDistance === bestRowDistance &&
            columnDistance < bestColumnDistance)
        ) {
          candidateIndex = index;
          bestRowDistance = rowDistance;
          bestColumnDistance = columnDistance;
        }
      }

      return candidateIndex;
    },
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

  const focusOption = useCallback((index: number) => {
    optionRefs.current[index]?.focus();
  }, []);

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
        selectEmoji(selectedIcon);
      }
    },
    [selectEmoji],
  );

  const setOptionRef = useCallback(
    (index: number, element: HTMLButtonElement | null) => {
      optionRefs.current[index] = element;
    },
    [],
  );

  const onSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }

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
          selectEmoji(emoji.unicode);
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
    [activeIndex, focusOption, moveActive, moveActiveVertical, selectEmoji],
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
        const nextIndex = (index + 1 + emojis.length) % emojis.length;
        focusAndActivate(nextIndex);
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const nextIndex = (index - 1 + emojis.length) % emojis.length;
        focusAndActivate(nextIndex);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const nextIndex = findVerticalIndex(index, 1);
        focusAndActivate(nextIndex);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const nextIndex = findVerticalIndex(index, -1);
        focusAndActivate(nextIndex);
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
          selectEmoji(emoji.unicode);
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        requestAnimationFrame(() => {
          triggerRef.current?.focus();
        });
      }
    },
    [findVerticalIndex, focusOption, selectEmoji],
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

  const onFocusOutside = useCallback((event: Event) => {
    event.preventDefault();
  }, []);

  return (
    <>
      <TextField.Root
        defaultValue={defaultValue}
        placeholder={placeholder}
        name={name}
        type="text"
        id={id}
        required={required}
      >
        <TextField.Slot>
          <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger>
              <IconButton
                ref={triggerRef}
                type="button"
                variant="ghost"
                color="gray"
                size="1"
                aria-label="Choose emoji icon"
              >
                <span className={icon ? undefined : s.emojiPlaceholder}>
                  {icon || '🙂'}
                </span>
              </IconButton>
            </Popover.Trigger>
            <Popover.Content
              width={{ md: '420px', initial: '100%' }}
              onFocusOutside={onFocusOutside}
            >
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
                      onClick={clearIcon}
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
                  aria-expanded={open}
                  aria-activedescendant={
                    activeIndex >= 0
                      ? `${listboxId}-opt-${activeIndex}`
                      : undefined
                  }
                  placeholder="Search emoji"
                  value={query}
                  onChange={onSearchChange}
                  onKeyDown={onSearchKeyDown}
                />

                <Text size="1" color="gray" className={s.srOnly}>
                  When search results are available, use arrow keys to navigate
                  and Enter to choose.
                </Text>

                <div
                  ref={pickerContainerRef}
                  id={listboxId}
                  role="listbox"
                  aria-label="Search results"
                  className={s.pickerContainer}
                >
                  {categorySections.map((section) => (
                    <section key={section.id} className={s.categorySection}>
                      <div className={s.categoryHeader}>
                        <span aria-hidden="true">{section.icon}</span>
                        <Text size="1" weight="medium" color="gray">
                          {section.label}
                        </Text>
                      </div>
                      <div className={s.pickerGrid}>
                        {section.emojis.map((emoji) => {
                          const index =
                            filteredEmojiIndexById.get(emoji.id) ?? -1;
                          if (index < 0) {
                            return null;
                          }
                          const isActive = index === activeIndex;
                          const isSelected = emoji.unicode === icon;
                          const buttonClassName = [
                            s.emojiButton,
                            isSelected ? s.emojiButtonSelected : '',
                            isActive ? s.emojiButtonActive : '',
                          ]
                            .filter(Boolean)
                            .join(' ');

                          return (
                            <button
                              key={emoji.id}
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
                              onMouseDown={onOptionMouseDown}
                              onMouseEnter={onOptionMouseEnter}
                              onFocus={onOptionFocus}
                              onKeyDown={onOptionListKeyDown}
                              onClick={onOptionClick}
                            >
                              <span className={s.emojiChar}>
                                {emoji.unicode}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))}

                  {filteredEmojis.length === 0 ? (
                    <Text size="1" color="gray" className={s.emptyState}>
                      No emoji found
                    </Text>
                  ) : null}
                </div>
              </Flex>
            </Popover.Content>
          </Popover.Root>
        </TextField.Slot>
      </TextField.Root>
      <input type="hidden" name={iconName} value={icon} />
    </>
  );
}
