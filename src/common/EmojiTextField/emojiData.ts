import data from '@emoji-mart/data';

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

export type EmojiOption = {
  id: string;
  unicode: string;
  annotation: string;
  keywords: string[];
  categoryId: string;
};

export type EmojiCategorySection = {
  id: string;
  label: string;
  icon: string;
  emojis: EmojiOption[];
};

export type EmojiGridPosition = {
  sectionOrder: number;
  row: number;
  col: number;
  absoluteRow: number;
};

export const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  people: { label: 'Smileys & People', icon: '😀' },
  nature: { label: 'Animals & Nature', icon: '🐻' },
  foods: { label: 'Food & Drink', icon: '🍔' },
  activity: { label: 'Activity', icon: '⚽' },
  places: { label: 'Travel & Places', icon: '✈️' },
  objects: { label: 'Objects', icon: '💡' },
  symbols: { label: 'Symbols', icon: '❤️' },
  flags: { label: 'Flags', icon: '🏁' },
};

export const EMOJI_DATA = data as unknown as EmojiMartData;
export const EMOJI_COLUMNS = 8;

let _emojiOptionsCache: EmojiOption[] | null = null;

export function getEmojiOptions(): EmojiOption[] {
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

export function filterEmojisByQuery(query: string): {
  sections: EmojiCategorySection[];
  flat: EmojiOption[];
} {
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

  const flat = sections.flatMap((section) => section.emojis);

  return { sections, flat };
}

export function buildEmojiGridPositions(
  categorySections: EmojiCategorySection[],
  filteredEmojiIndexById: Map<string, number>,
): Map<number, EmojiGridPosition> {
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
        absoluteRow: absoluteRowOffset + Math.floor(localIndex / EMOJI_COLUMNS),
      });
    });

    absoluteRowOffset += Math.ceil(section.emojis.length / EMOJI_COLUMNS);
  });

  return positions;
}

export function findVerticalNeighbor(
  currentIndex: number,
  direction: -1 | 1,
  emojiGridPositions: Map<number, EmojiGridPosition>,
): number {
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

    const rowDistance = Math.abs(position.absoluteRow - current.absoluteRow);
    const columnDistance = Math.abs(position.col - current.col);

    if (
      rowDistance < bestRowDistance ||
      (rowDistance === bestRowDistance && columnDistance < bestColumnDistance)
    ) {
      candidateIndex = index;
      bestRowDistance = rowDistance;
      bestColumnDistance = columnDistance;
    }
  }

  return candidateIndex;
}
