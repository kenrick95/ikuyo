import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DropdownMenu,
  Flex,
  Heading,
  Popover,
  Table,
  Text,
  TextField,
} from '@radix-ui/themes';
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { RenderContent } from '../../common/RenderContent';
import { patchMutation, postMutation } from '../../data/apiClient';
import { id } from '../../data/id';
import { useBoundStore } from '../../data/store';
import { isTripOwner } from '../permissions';
import type { TripSliceTrip } from '../store/types';
import { TripSharingDialog } from '../TripDialog/TripSharingDialog';
import s from './TripPeopleDialog.module.css';
import { EMPTY_TRIP_PEOPLE, type TripPerson } from './types';

type AccountMatch = { id: string; handle: string };

async function findAccount(prefix: string, identity: string) {
  const { user } = await postMutation<{ user: AccountMatch | null }>(
    `${prefix}/lookup`,
    { identity },
  );
  return user;
}

export function useTripPeople(
  trip: TripSliceTrip,
  includeSelf = false,
): TripPerson[] {
  const [userId, handle, hasEmail] = useBoundStore(
    useShallow((state) =>
      includeSelf
        ? ([
            state.currentUser?.id,
            state.currentUser?.handle,
            !!state.currentUser?.email,
          ] as const)
        : ([undefined, undefined, false] as const),
    ),
  );
  const people = trip.people ?? EMPTY_TRIP_PEOPLE;
  return useMemo(() => {
    if (
      !userId ||
      handle === undefined ||
      people.some((p) => p.userId === userId)
    ) {
      return people;
    }
    return [
      {
        id: 'me',
        name: handle,
        handle,
        userId,
        hasAccount: true,
        accountType: hasEmail ? 'registered' : 'guest',
        isParticipant: false,
        accessRole: null,
      },
      ...people,
    ];
  }, [people, userId, handle, hasEmail]);
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
  const [open, setOpen] = useState(false);
  const people = useTripPeople(trip, selected !== undefined);
  const [pending, setPending] = useState<string[]>([]);
  const pendingIds = useMemo(() => new Set(pending), [pending]);
  const [query, setQuery] = useState('');
  const [match, setMatch] = useState<AccountMatch | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const renameInput = useRef<HTMLInputElement>(null);
  const rowActions = useRef(new Map<string, HTMLButtonElement>());
  const renameReturnId = useRef<string | null>(null);
  const [linking, setLinking] = useState<{
    personId: string;
    personName: string;
    anchor: HTMLButtonElement;
  } | null>(null);
  const linkFromMenu = useRef<string | null>(null);
  const linkDismissedOutside = useRef(false);
  const refreshTrip = useBoundStore((state) => state.refreshTrip);
  const pushDialog = useBoundStore((state) => state.pushDialog);
  const prefix = `/api/trips/${encodeURIComponent(trip.id)}/people`;
  const lookup = query.startsWith('@') || query.includes('@');

  useLayoutEffect(() => {
    if (!renaming && !loading && renameReturnId.current) {
      if (open) rowActions.current.get(renameReturnId.current)?.focus();
      renameReturnId.current = null;
    }
  }, [loading, open, renaming]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update person.');
    } finally {
      setLoading(false);
    }
  }

  async function add(user?: AccountMatch) {
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
    if (!query.trim()) return;
    if (!lookup) return add();
    setLoading(true);
    setError('');
    setMatch(null);
    try {
      const account = await findAccount(prefix, query.trim());
      setMatch(account);
      if (!account) setError('No matching account.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to find account.');
    } finally {
      setLoading(false);
    }
  }

  function renderContent() {
    return (
      <>
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
          <Table.Root layout="fixed" className={s.peopleTable}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Person</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className={s.joiningColumn}>
                  {selected ? 'Include' : 'Joining'}
                </Table.ColumnHeaderCell>
                {!selected && (
                  <>
                    <Table.ColumnHeaderCell className={s.accessColumn}>
                      Access
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell className={s.actionsColumn}>
                      Actions
                    </Table.ColumnHeaderCell>
                  </>
                )}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {people.map((p) => (
                <Table.Row key={p.id}>
                  <Table.RowHeaderCell className={s.personCell}>
                    {renaming === p.id ? (
                      <Flex direction="column" gap="2">
                        <TextField.Root
                          ref={renameInput}
                          aria-label={`Name for ${p.name}`}
                          value={newName}
                          disabled={loading}
                          style={{ minWidth: 0, width: '100%' }}
                          onChange={(e) => setNewName(e.target.value)}
                        />
                        <Flex gap="2" wrap="wrap">
                          <Button
                            type="button"
                            size="1"
                            disabled={loading || !newName.trim()}
                            onClick={() =>
                              void updateParticipant(p.id, {
                                name: newName.trim(),
                              })
                            }
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="1"
                            variant="soft"
                            color="gray"
                            disabled={loading}
                            onClick={() => setRenaming(null)}
                          >
                            Cancel
                          </Button>
                        </Flex>
                      </Flex>
                    ) : (
                      <PersonLabel person={p} />
                    )}
                    {!selected && (
                      <Text size="1" color="gray" className={s.mobileAccess}>
                        {accessLabel(p)}
                      </Text>
                    )}
                  </Table.RowHeaderCell>
                  <Table.Cell className={s.joiningColumn}>
                    {selected ? (
                      <Checkbox
                        aria-label={`Include ${p.name}`}
                        checked={pendingIds.has(p.id)}
                        onCheckedChange={(checked) =>
                          setPending((previous) =>
                            checked
                              ? [...previous, p.id]
                              : previous.filter((x) => x !== p.id),
                          )
                        }
                        disabled={
                          loading || (p.archived && !pendingIds.has(p.id))
                        }
                      />
                    ) : (
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
                    )}
                  </Table.Cell>
                  {!selected && (
                    <>
                      <Table.Cell className={s.accessColumn}>
                        <Text size="2" color="gray">
                          {accessLabel(p)}
                        </Text>
                      </Table.Cell>
                      <Table.Cell className={s.actionsColumn}>
                        {p.id !== 'me' && (
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger>
                              <Button
                                ref={(button) => {
                                  if (button)
                                    rowActions.current.set(p.id, button);
                                  else rowActions.current.delete(p.id);
                                }}
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
                            <DropdownMenu.Content
                              onCloseAutoFocus={(event) => {
                                if (linkFromMenu.current === p.id) {
                                  event.preventDefault();
                                  linkFromMenu.current = null;
                                  linkDismissedOutside.current = false;
                                  const anchor = rowActions.current.get(p.id);
                                  if (anchor) {
                                    setLinking({
                                      personId: p.id,
                                      personName: p.name,
                                      anchor,
                                    });
                                  }
                                  return;
                                }
                                const input = renameInput.current;
                                if (!input || renameReturnId.current !== p.id)
                                  return;
                                event.preventDefault();
                                input.focus();
                              }}
                            >
                              <DropdownMenu.Item
                                onSelect={() => {
                                  renameReturnId.current = p.id;
                                  setRenaming(p.id);
                                  setNewName(p.name);
                                }}
                              >
                                Rename
                              </DropdownMenu.Item>
                              {!p.hasAccount ? (
                                <DropdownMenu.Item
                                  onSelect={() => {
                                    linkFromMenu.current = p.id;
                                  }}
                                >
                                  Link account
                                </DropdownMenu.Item>
                              ) : (
                                <DropdownMenu.Item
                                  onSelect={() =>
                                    void updateParticipant(p.id, {
                                      userId: null,
                                    })
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
                      </Table.Cell>
                    </>
                  )}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
          {linking && (
            <Popover.Root
              open
              onOpenChange={(next) => {
                if (!next && !loading) setLinking(null);
              }}
            >
              <Popover.Anchor virtualRef={{ current: linking.anchor }} />
              <Popover.Content
                aria-label={`Link account to ${linking.personName}`}
                align="end"
                collisionPadding={12}
                className={s.linkPopover}
                onEscapeKeyDown={(event) => {
                  if (loading) event.preventDefault();
                }}
                onInteractOutside={(event) => {
                  if (loading) event.preventDefault();
                  else linkDismissedOutside.current = true;
                }}
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  if (!linkDismissedOutside.current) linking.anchor.focus();
                }}
              >
                <LinkAccountForm
                  personName={linking.personName}
                  prefix={prefix}
                  loading={loading}
                  setLoading={setLoading}
                  onLink={async (userId) => {
                    await patchMutation(
                      `${prefix}/${encodeURIComponent(linking.personId)}`,
                      { userId },
                    );
                    await refreshTrip(trip.id);
                    setLinking(null);
                  }}
                />
              </Popover.Content>
            </Popover.Root>
          )}
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
              {selected ? 'Cancel' : 'Close'}
            </Button>
          </Dialog.Close>
          {selected && (
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
          )}
        </Flex>
      </>
    );
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
      <Dialog.Content maxWidth="600px" aria-describedby={undefined}>
        <RenderContent>{renderContent}</RenderContent>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function LinkAccountForm({
  personName,
  prefix,
  loading,
  setLoading,
  onLink,
}: {
  personName: string;
  prefix: string;
  loading: boolean;
  setLoading: (value: boolean) => void;
  onLink: (userId: string) => Promise<void>;
}) {
  const identityId = useId();
  const [identity, setIdentity] = useState('');
  const [match, setMatch] = useState<AccountMatch | null>(null);
  const [error, setError] = useState('');

  async function lookup() {
    const query = identity.trim();
    if (!query.includes('@')) {
      setError('Enter an Ikuyo email or @username.');
      return;
    }
    setLoading(true);
    setMatch(null);
    setError('');
    try {
      const account = await findAccount(prefix, query);
      setMatch(account);
      if (!account) setError('No matching account.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to find account.');
    } finally {
      setLoading(false);
    }
  }

  async function link(account: AccountMatch) {
    setLoading(true);
    setError('');
    try {
      await onLink(account.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to link account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Flex direction="column" gap="3">
      <Heading as="h3" size="3">
        Link account to {personName}
      </Heading>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!loading && identity.trim()) void lookup();
        }}
      >
        <Flex direction="column" gap="1">
          <Text as="label" htmlFor={identityId} size="2">
            Ikuyo email or @username
          </Text>
          <Flex gap="2">
            <TextField.Root
              id={identityId}
              className={s.linkIdentity}
              value={identity}
              maxLength={255}
              autoCapitalize="none"
              spellCheck={false}
              readOnly={loading}
              onChange={(event) => {
                setIdentity(event.target.value);
                setMatch(null);
                setError('');
              }}
            />
            <Button
              type="submit"
              variant="outline"
              disabled={loading || !identity.trim()}
            >
              Find
            </Button>
          </Flex>
        </Flex>
      </form>
      {match && (
        <Text size="2" role="status">
          Found @{match.handle}
        </Text>
      )}
      {error && (
        <Text size="2" color="red" role="alert">
          {error}
        </Text>
      )}
      <Text size="1" color="gray">
        Trip access stays the same.
      </Text>
      <Flex gap="2" justify="end" wrap="wrap">
        <Popover.Close>
          <Button type="button" variant="soft" color="gray" disabled={loading}>
            Cancel
          </Button>
        </Popover.Close>
        <Button
          type="button"
          disabled={!match || loading}
          onClick={() => {
            if (match) void link(match);
          }}
        >
          Link account
        </Button>
      </Flex>
    </Flex>
  );
}

function accessLabel(person: TripPerson) {
  return person.accessRole === 0
    ? 'Owner'
    : person.accessRole === 1
      ? 'Editor'
      : person.accessRole === 2
        ? 'Viewer'
        : 'No access';
}
