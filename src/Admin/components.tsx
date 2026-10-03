import { Button, Callout, DropdownMenu, Text } from '@radix-ui/themes';
import { useState } from 'react';
import { deleteMutation, postMutation } from '../data/apiClient';

export function LoadState({
  loading,
  error,
  empty,
}: {
  loading: boolean;
  error?: string;
  empty?: string;
}) {
  if (error)
    return (
      <Callout.Root color="red" role="alert">
        <Callout.Text>{error}</Callout.Text>
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
  async function change() {
    if (
      !deleted &&
      !window.confirm(
        `Soft-delete “${label}”? ${account ? 'This signs them out. Their trips and content stay recoverable.' : 'This content remains recoverable.'}`,
      )
    )
      return;
    setBusy(true);
    setError(undefined);
    try {
      if (deleted) await postMutation(`${path}/restore`, {});
      else await deleteMutation(path);
      onChanged();
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
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
            color={deleted ? 'green' : 'red'}
            onSelect={() => void change()}
          >
            {deleted ? 'Restore' : 'Delete'}
            {account ? ' account' : ''}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      {error ? (
        <Text as="p" color="red" size="1" role="alert">
          {error}
        </Text>
      ) : null}
    </div>
  );
}
