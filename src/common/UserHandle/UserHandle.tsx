import { Avatar, Box, Flex, Text, Tooltip } from '@radix-ui/themes';
import { useMemo } from 'react';

// Avoid those that look like theme color (primary) and yellow (danger token)
const colors = [
  'gray',
  'gold',
  'bronze',
  'brown',
  'plum',
  'purple',
  'violet',
  'iris',
  'indigo',
  'blue',
  'cyan',
  'teal',
  'jade',
  'green',
  'grass',
  'lime',
  'mint',
  'sky',
] as const;

// djb2 string hash: distributes a handle deterministically across 32-bit range.
export function hashString(handle: string): number {
  let hash = 5381;
  for (const char of Array.from(handle)) {
    hash = (hash << 5) + hash + char.charCodeAt(0); // hash * 33 + char
    hash |= 0; // Keep within 32-bit integer range
  }
  return Math.abs(hash);
}

export function getColorForHandle(
  handle: string | undefined,
): (typeof colors)[number] {
  if (!handle) return 'gray';
  return colors[hashString(handle) % colors.length];
}

export function UserHandle({
  handle,
  size = '2',
  mode,
}: {
  handle: string | undefined;
  size: '1' | '2';
  mode: 'full' | 'compact' | 'avatar-only';
}) {
  const color = useMemo(() => getColorForHandle(handle), [handle]);
  const avatar = useMemo(
    () => (
      <Avatar
        highContrast={true}
        size={size}
        radius="full"
        color={color}
        variant="soft"
        fallback={handle?.[0]?.toUpperCase() ?? '?'}
      />
    ),
    [handle, size, color],
  );

  return (
    <Flex align="baseline" gap="1">
      {mode === 'compact' ? (
        <Tooltip content={handle}>
          <Box as="span">{avatar}</Box>
        </Tooltip>
      ) : (
        avatar
      )}
      {mode === 'full' ? (
        <Text as="span" size={size} color="gray">
          {handle}
        </Text>
      ) : null}
    </Flex>
  );
}
