import { ArrowDownIcon, ArrowUpIcon } from '@radix-ui/react-icons';
import { Flex, IconButton, Tooltip } from '@radix-ui/themes';

export function SwapLocationsButton({ onSwap }: { onSwap: () => void }) {
  return (
    <Flex justify="center">
      <Tooltip content="Swap origin and destination">
        <IconButton
          type="button"
          variant="ghost"
          color="gray"
          size="2"
          aria-label="Swap origin and destination"
          onClick={onSwap}
        >
          <Flex gap="0" aria-hidden="true">
            <ArrowUpIcon width="12" />
            <ArrowDownIcon width="12" />
          </Flex>
        </IconButton>
      </Tooltip>
    </Flex>
  );
}
