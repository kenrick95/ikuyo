import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DropdownMenu,
  Flex,
  Text,
  TextField,
} from '@radix-ui/themes';
import { useState } from 'react';
import { patchMutation, postMutation } from '../../data/apiClient';
import { id } from '../../data/id';
import { useBoundStore } from '../../data/store';
import { isTripOwner } from '../permissions';
import type { TripSliceTrip } from '../store/types';
import { TripSharingDialog } from '../TripDialog/TripSharingDialog';
import type { TripPerson } from './types';

export function useTripPeople(
  trip: TripSliceTrip,
  includeSelf = false,
): TripPerson[] {
  const currentUser = useBoundStore((state) => state.currentUser);
  const people = trip.people ?? [];
  return includeSelf &&
    currentUser &&
    !people.some((p) => p.userId === currentUser.id)
    ? [
        {
          id: 'me',
          name: currentUser.handle,
          handle: currentUser.handle,
          userId: currentUser.id,
          hasAccount: true,
          accountType: currentUser.email ? 'registered' : 'guest',
          isParticipant: false,
          accessRole: null,
        },
        ...people,
      ]
    : people;
}

export function PersonLabel({ person }: { person: TripPerson }) {
  const currentId = useBoundStore((state) => state.currentUser?.id);
  return (
    <Flex as="span" align="center" gap="2" wrap="wrap">
      <Text>
        {person.name}
        {person.userId && person.userId === currentId ? ' (you)' : ''}
      </Text>
      {!person.hasAccount ? (
        <Badge color="gray">No account</Badge>
      ) : (
        person.handle && (
          <Text size="1" color="gray">
            @{person.handle}
          </Text>
        )
      )}
      {person.accountType === 'guest' && (
        <Badge color="gray">Guest account</Badge>
      )}
      {person.archived && <Badge color="gray">Archived</Badge>}
    </Flex>
  );
}

export function TripPeopleDialog({
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
  const people = useTripPeople(trip, selected !== undefined);
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
  const [linking, setLinking] = useState<string | null>(null);
  const refreshTrip = useBoundStore((state) => state.refreshTrip);
  const pushDialog = useBoundStore((state) => state.pushDialog);
  const prefix = `/api/trips/${encodeURIComponent(trip.id)}/people`;
  const lookup = query.startsWith('@') || query.includes('@');

  async function updateParticipant(
    participant: string,
    data: {
      name?: string;
      archived?: boolean;
      isParticipant?: boolean;
      userId?: string | null;
    },
  ) {
    setLoading(true);
    setError('');
    try {
      await patchMutation(`${prefix}/${encodeURIComponent(participant)}`, data);
      await refreshTrip(trip.id);
      setRenaming(null);
      setLinking(null);
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
      if (linking && user) {
        await updateParticipant(linking, { userId: user.id });
        setQuery('');
        setMatch(null);
        return;
      }
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
    if (linking && !lookup) {
      setError('Enter an Ikuyo email or @username.');
      return;
    }
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
          setLinking(null);
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
            {linking
              ? `Link account to ${people.find((p) => p.id === linking)?.name}`
              : 'Add or find a person'}
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
                {lookup || linking ? 'Find' : 'Add'}
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
                {linking ? 'Link' : 'Add'}
              </Button>
            </Flex>
          )}
          {linking && (
            <Button
              type="button"
              variant="ghost"
              disabled={loading}
              onClick={() => {
                setLinking(null);
                setMatch(null);
                setQuery('');
              }}
            >
              Cancel link
            </Button>
          )}
          {people.map((p) => (
            <Flex key={p.id} align="center" gap="3" py="1" wrap="wrap">
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
              <PersonLabel person={p} />
              {!selected && (
                <Text as="label" size="2">
                  <Flex align="center" gap="2">
                    <Checkbox
                      checked={p.isParticipant}
                      disabled={loading || p.archived}
                      aria-label={`${p.name} is joining the trip`}
                      onCheckedChange={(checked) =>
                        void updateParticipant(p.id, {
                          isParticipant: checked === true,
                        })
                      }
                    />
                    Joining
                  </Flex>
                </Text>
              )}
              {!selected && p.hasAccount && (
                <Text size="1" color="gray">
                  {p.accessRole === 0
                    ? 'Owner'
                    : p.accessRole === 1
                      ? 'Editor'
                      : p.accessRole === 2
                        ? 'Viewer'
                        : 'No access'}
                </Text>
              )}
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
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger>
                        <Button
                          type="button"
                          size="1"
                          variant="ghost"
                          color="gray"
                          disabled={loading}
                          aria-label={`Actions for ${p.name}`}
                        >
                          <DotsHorizontalIcon />
                        </Button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content>
                        <DropdownMenu.Item
                          onSelect={() => {
                            setRenaming(p.id);
                            setNewName(p.name);
                          }}
                        >
                          Rename
                        </DropdownMenu.Item>
                        {!p.hasAccount ? (
                          <DropdownMenu.Item
                            onSelect={() => {
                              setLinking(p.id);
                              setQuery('');
                              setMatch(null);
                              setError('');
                            }}
                          >
                            Link account
                          </DropdownMenu.Item>
                        ) : (
                          <DropdownMenu.Item
                            onSelect={() =>
                              void updateParticipant(p.id, { userId: null })
                            }
                          >
                            Unlink account
                          </DropdownMenu.Item>
                        )}
                        {p.handle &&
                          p.accessRole !== 0 &&
                          isTripOwner(trip) && (
                            <DropdownMenu.Item
                              onSelect={() => {
                                setOpen(false);
                                pushDialog(TripSharingDialog, {
                                  tripId: trip.id,
                                  accountIdentity: `@${p.handle}`,
                                });
                              }}
                            >
                              Share
                            </DropdownMenu.Item>
                          )}
                        <DropdownMenu.Item
                          onSelect={() =>
                            void updateParticipant(p.id, {
                              archived: !p.archived,
                            })
                          }
                        >
                          {p.archived ? 'Restore' : 'Archive'}
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
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
