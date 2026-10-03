import { Button, Callout, DropdownMenu, Text } from '@radix-ui/themes';
import { useEffect, useRef, useState } from 'react';
import { deleteMutation, postMutation } from '../data/apiClient';

export function LoadState({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading: boolean;
  error?: string;
  empty?: string;
  onRetry?: () => void;
}) {
  if (error)
    return (
      <Callout.Root color="red" role="alert">
        <Callout.Text>{error}</Callout.Text>
        {onRetry ? (
          <Button variant="soft" color="red" size="1" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </Callout.Root>
    );
  if (loading)
    return (
      <Text size="2" color="gray" role="status">
        Loading…
      </Text>
    );
  return empty ? (
    <Text size="2" color="gray">
      {empty}
    </Text>
  ) : null;
}

export function RecordActions({
  path,
  deleted,
  label,
  disabled,
  onChanged,
  account = false,
}: {
  path: string;
  deleted: boolean;
  label: string;
  disabled?: boolean;
  onChanged: () => void;
  account?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const pending = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function change() {
    if (disabled || pending.current) return;
    if (
      !deleted &&
      !window.confirm(
        `Soft-delete “${label}”? ${account ? 'This signs them out. Their trips and content stay recoverable.' : 'This content remains recoverable.'}`,
      )
    )
      return;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      if (deleted) await postMutation(`${path}/restore`, {});
      else await deleteMutation(path);
      if (mounted.current) onChanged();
    } catch (reason) {
      if (mounted.current) setError(String(reason));
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <div>
      {deleted ? (
        <Button
          variant="soft"
          color="green"
          size="1"
          disabled={disabled || busy}
          onClick={() => void change()}
          aria-label={`Restore ${label}`}
        >
          {busy ? 'Restoring…' : account ? 'Restore account' : 'Restore'}
        </Button>
      ) : (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button
              variant="soft"
              size="1"
              disabled={disabled || busy}
              aria-label={`Actions for ${label}`}
            >
              {busy ? 'Updating…' : 'Actions'} <DropdownMenu.TriggerIcon />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item
              disabled={disabled || busy}
              color={deleted ? 'green' : 'red'}
              onSelect={() => void change()}
            >
              {deleted ? 'Restore' : 'Delete'}
              {account ? ' account' : ''}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      )}
      {error ? (
        <Text as="p" color="red" size="1" role="alert">
          {error}
        </Text>
      ) : null}
    </div>
  );
}
