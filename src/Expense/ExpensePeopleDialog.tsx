import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  Flex,
  Text,
  TextField,
} from '@radix-ui/themes';
import { useState } from 'react';
import { patchMutation, postMutation } from '../data/apiClient';
import { id } from '../data/id';
import { useBoundStore } from '../data/store';
import type { TripSliceTrip } from '../Trip/store/types';
import type { ExpenseParticipant } from './ledger';

export function useExpensePeople(trip: TripSliceTrip): ExpenseParticipant[] {
  const currentUser = useBoundStore((state) => state.currentUser);
  const people = trip.expenseLedger?.participants ?? [];
  return currentUser && !people.some((p) => p.userId === currentUser.id)
    ? [
        {
          id: 'me',
          name: currentUser.handle,
          handle: currentUser.handle,
          userId: currentUser.id,
          guest: false,
        },
        ...people,
      ]
    : people;
}

export function ParticipantLabel({ person }: { person: ExpenseParticipant }) {
  const currentId = useBoundStore((state) => state.currentUser?.id);
  return (
    <Flex as="span" align="center" gap="2" wrap="wrap">
      <Text>
        {person.name}
        {person.userId && person.userId === currentId ? ' (you)' : ''}
      </Text>
      {person.guest ? (
        <Badge color="gray">Guest</Badge>
      ) : (
        person.handle && (
          <Text size="1" color="gray">
            @{person.handle}
          </Text>
        )
      )}
      {person.archived && <Badge color="gray">Archived</Badge>}
    </Flex>
  );
}

export function ExpensePeopleDialog({
  trip,
  selected,
  onApply,
  disabled = false,
}: {
  trip: TripSliceTrip;
  selected?: string[];
  onApply?: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const people = useExpensePeople(trip);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [match, setMatch] = useState<{ id: string; handle: string } | null>(
    null,
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const refreshTrip = useBoundStore((state) => state.refreshTrip);
  const prefix = `/api/trips/${encodeURIComponent(trip.id)}/expense-participants`;
  const lookup = query.startsWith('@') || query.includes('@');

  async function updateParticipant(
    participant: string,
    data: { name?: string; archived?: boolean },
  ) {
    setLoading(true);
    setError('');
    try {
      await patchMutation(`${prefix}/${encodeURIComponent(participant)}`, data);
      await refreshTrip(trip.id);
      setRenaming(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update person.');
    } finally {
      setLoading(false);
    }
  }

  async function add(user?: { id: string; handle: string }) {
    setLoading(true);
    setError('');
    try {
      const result = await postMutation<{ id: string }>(
        prefix,
        user ? { id: id(), userId: user.id } : { id: id(), name: query.trim() },
      );
      if (selected)
        setPending((previous) => [...new Set([...previous, result.id])]);
      setQuery('');
      setMatch(null);
      await refreshTrip(trip.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add person.');
    } finally {
      setLoading(false);
    }
  }

  async function findOrAdd() {
    if (!lookup) return add();
    setLoading(true);
    setError('');
    setMatch(null);
    try {
      const result = await postMutation<{
        user: { id: string; handle: string } | null;
      }>(`${prefix}/lookup`, { identity: query.trim() });
      setMatch(result.user);
      if (!result.user) setError('No matching account.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to find account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (loading) return;
        setOpen(value);
        if (value) {
          setPending(selected ?? []);
          setQuery('');
          setMatch(null);
          setError('');
          setRenaming(null);
        }
      }}
    >
      <Dialog.Trigger>
        <Button
          type="button"
          variant="outline"
          color="gray"
          size="2"
          disabled={disabled}
        >
          {selected ? 'Choose people' : 'People'}
        </Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="440px" aria-describedby={undefined}>
        <Dialog.Title>{selected ? 'Split between' : 'People'}</Dialog.Title>
        <Flex direction="column" gap="3">
          <Text as="label" size="2">
            Add or find a person
            <Flex gap="2" mt="1">
              <TextField.Root
                style={{ flex: 1 }}
                placeholder="Name, Ikuyo email or @username"
                value={query}
                maxLength={100}
                disabled={loading}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setMatch(null);
                  setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void findOrAdd();
                  }
                }}
              />
              <Button
                type="button"
                disabled={loading || !query.trim()}
                onClick={() => void findOrAdd()}
              >
                {lookup ? 'Find' : 'Add'}
              </Button>
            </Flex>
          </Text>
          {match && (
            <Flex align="center" justify="between">
              <Text>@{match.handle}</Text>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => void add(match)}
              >
                Add
              </Button>
            </Flex>
          )}
          {people.map((p) => (
            <Flex key={p.id} align="center" gap="3" py="1">
              {selected && (
                <Checkbox
                  aria-label={`Include ${p.name}`}
                  checked={pending.includes(p.id)}
                  onCheckedChange={(checked) =>
                    setPending((previous) =>
                      checked
                        ? [...previous, p.id]
                        : previous.filter((x) => x !== p.id),
                    )
                  }
                  disabled={loading || (p.archived && !pending.includes(p.id))}
                />
              )}
              <ParticipantLabel person={p} />
              {!selected && p.id !== 'me' && (
                <Flex gap="2" wrap="wrap" ml="auto">
                  {renaming === p.id ? (
                    <>
                      <TextField.Root
                        aria-label={`Name for ${p.name}`}
                        value={newName}
                        disabled={loading}
                        style={{ maxWidth: 160 }}
                        onChange={(e) => setNewName(e.target.value)}
                      />
                      <Button
                        type="button"
                        size="1"
                        disabled={loading || !newName.trim()}
                        onClick={() =>
                          void updateParticipant(p.id, { name: newName.trim() })
                        }
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="1"
                        variant="ghost"
                        disabled={loading}
                        onClick={() => setRenaming(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        size="1"
                        variant="ghost"
                        disabled={loading}
                        onClick={() => {
                          setRenaming(p.id);
                          setNewName(p.name);
                        }}
                      >
                        Rename
                      </Button>
                      <Button
                        type="button"
                        size="1"
                        variant="ghost"
                        disabled={loading}
                        onClick={() =>
                          void updateParticipant(p.id, {
                            archived: !p.archived,
                          })
                        }
                      >
                        {p.archived ? 'Restore' : 'Archive'}
                      </Button>
                    </>
                  )}
                </Flex>
              )}
            </Flex>
          ))}
          {error && (
            <Text color="red" size="2" role="alert">
              {error}
            </Text>
          )}
        </Flex>
        <Flex gap="2" justify="end" mt="5">
          <Dialog.Close>
            <Button
              type="button"
              variant="soft"
              color="gray"
              disabled={loading}
            >
              Cancel
            </Button>
          </Dialog.Close>
          <Button
            type="button"
            disabled={loading}
            onClick={() => {
              onApply?.(pending);
              setOpen(false);
            }}
          >
            Done
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
