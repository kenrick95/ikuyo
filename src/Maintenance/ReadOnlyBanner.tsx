import { Callout } from '@radix-ui/themes';
import { readOnlyMode } from '../data/backendConfig';

/**
 * A slim, dismissible-in-spirit banner shown above the app when
 * `IKUYO_READ_ONLY_MODE` is on but the app itself is still usable for reading.
 * Writes are rejected at the data layer regardless; this just tells the user why.
 */
export function ReadOnlyBanner({ className }: { className?: string }) {
  if (!readOnlyMode) {
    return null;
  }
  return (
    <Callout.Root
      variant="surface"
      color="red"
      className={className}
      role="note"
    >
      <Callout.Icon>
        <span aria-hidden>🔒</span>
      </Callout.Icon>
      <Callout.Text>
        Ikuyo is in read-only mode while we migrate — you can view your trips,
        but edits are temporarily disabled.
      </Callout.Text>
    </Callout.Root>
  );
}
