import {
  Badge,
  Button,
  Callout,
  Container,
  DropdownMenu,
  Flex,
  Heading,
  Spinner,
  Tabs,
  Text,
  TextField,
} from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useCurrentUser } from '../Auth/hooks';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import type { CursorPage } from '../data/apiClient';
import { deleteMutation, get, postMutation } from '../data/apiClient';
import { DocTitle } from '../Nav/DocTitle';
import { Navbar } from '../Nav/Navbar';
import styles from './PageAdmin.module.css';

type AdminUser = {
  id: string;
  handle: string;
  email: string | null;
  role: 'user' | 'admin';
  deletedAt: string | null;
};
type AdminTrip = {
  id: string;
  title: string;
  archivedAt: number | null;
  deletedAt: string | null;
};
type AdminContent = {
  entity: string;
  id: string;
  label: string;
  deletedAt: string | null;
};
type AdminAuditEvent = {
  id: number;
  actorHandle: string;
  tripId: string | null;
  targetType: string;
  targetId: string | null;
  action: string;
  details: { fields: string[]; submittedFields?: string[] };
  createdAt: number;
};

export default function PageAdmin() {
  const currentUser = useCurrentUser();
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser>();
  const [trips, setTrips] = useState<AdminTrip[]>([]);
  const [tripsNextCursor, setTripsNextCursor] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<AdminTrip>();
  const [content, setContent] = useState<AdminContent[]>([]);
  const [contentNextCursor, setContentNextCursor] = useState<string | null>(
    null,
  );
  const [auditEvents, setAuditEvents] = useState<AdminAuditEvent[]>([]);
  const [auditNextCursor, setAuditNextCursor] = useState<string | null>(null);
  const [auditRefresh, setAuditRefresh] = useState(0);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditAll, setAuditAll] = useState(false);
  const auditTrip = auditAll ? undefined : selectedTrip;

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    let active = true;
    setUsersLoading(true);
    void get<AdminUser[]>(
      `/api/admin/users?search=${encodeURIComponent(submittedSearch)}`,
    )
      .then((result) => {
        if (active) setUsers(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(String(reason));
      })
      .finally(() => {
        if (active) setUsersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentUser?.role, submittedSearch]);

  useEffect(() => {
    if (!selectedUser) return;
    let active = true;
    setTripsLoading(true);
    void get<CursorPage<AdminTrip>>(
      `/api/admin/users/${encodeURIComponent(selectedUser.id)}/trips`,
    )
      .then((result) => {
        if (active) {
          setTrips(result.data);
          setTripsNextCursor(result.nextCursor);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(String(reason));
      })
      .finally(() => {
        if (active) setTripsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedTrip) return;
    let active = true;
    setContentLoading(true);
    void get<CursorPage<AdminContent>>(
      `/api/admin/trips/${encodeURIComponent(selectedTrip.id)}/content`,
    )
      .then((result) => {
        if (active) {
          setContent(result.data);
          setContentNextCursor(result.nextCursor);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(String(reason));
      })
      .finally(() => {
        if (active) setContentLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedTrip]);

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    let active = true;
    setAuditLoading(true);
    setAuditEvents([]);
    setAuditNextCursor(null);
    const filter = new URLSearchParams({ refresh: String(auditRefresh) });
    if (auditTrip) filter.set('trip', auditTrip.id);
    void get<CursorPage<AdminAuditEvent>>(`/api/admin/audit-events?${filter}`)
      .then((result) => {
        if (active) {
          setAuditEvents(result.data);
          setAuditNextCursor(result.nextCursor);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(String(reason));
      })
      .finally(() => {
        if (active) setAuditLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentUser?.role, auditTrip, auditRefresh]);

  async function refresh() {
    if (!selectedUser) return;
    const nextTrips = await get<CursorPage<AdminTrip>>(
      `/api/admin/users/${encodeURIComponent(selectedUser.id)}/trips`,
    );
    setTrips(nextTrips.data);
    setTripsNextCursor(nextTrips.nextCursor);
    if (selectedTrip) {
      const updatedTrip = nextTrips.data.find(
        (trip) => trip.id === selectedTrip.id,
      );
      if (updatedTrip) setSelectedTrip(updatedTrip);
      const nextContent = await get<CursorPage<AdminContent>>(
        `/api/admin/trips/${encodeURIComponent(selectedTrip.id)}/content`,
      );
      setContent(nextContent.data);
      setContentNextCursor(nextContent.nextCursor);
    }
  }

  function selectUser(user?: AdminUser) {
    setSelectedUser(user);
    setAuditAll(false);
    setTrips([]);
    setTripsNextCursor(null);
    setSelectedTrip(undefined);
    setContent([]);
    setContentNextCursor(null);
  }

  async function change(path: string, restore: boolean, tripId?: string) {
    setBusy(true);
    setError(undefined);
    try {
      const result = restore
        ? await postMutation<{ deletedAt: string | null }>(
            `${path}/restore`,
            {},
          )
        : await deleteMutation<{ deletedAt: string | null }>(path);
      await refresh();
      if (tripId) {
        setTrips((previous) =>
          previous.map((trip) =>
            trip.id === tripId
              ? { ...trip, deletedAt: result.deletedAt }
              : trip,
          ),
        );
        setSelectedTrip((previous) =>
          previous?.id === tripId
            ? { ...previous, deletedAt: result.deletedAt }
            : previous,
        );
      }
      setAuditRefresh((value) => value + 1);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  }

  async function changeUser(user: AdminUser) {
    setBusy(true);
    setError(undefined);
    try {
      const path = `/api/admin/users/${encodeURIComponent(user.id)}`;
      if (user.deletedAt) await postMutation(`${path}/restore`, {});
      else await deleteMutation(path);
      const updated = await get<AdminUser[]>(
        `/api/admin/users?search=${encodeURIComponent(submittedSearch)}`,
      );
      setUsers(updated);
      if (selectedUser?.id === user.id) {
        setSelectedUser(updated.find((entry) => entry.id === user.id));
      }
      setAuditRefresh((value) => value + 1);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  }

  async function loadMore<T>(
    path: string,
    append: (items: T[]) => void,
    updateCursor: (cursor: string | null) => void,
  ) {
    setBusy(true);
    setError(undefined);
    try {
      const page = await get<CursorPage<T>>(path);
      append(page.data);
      updateCursor(page.nextCursor);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DocTitle title="Admin" />
      <Navbar
        leftItems={[
          <Heading key="admin" size="5">
            Admin
          </Heading>,
        ]}
        rightItems={[<UserAvatarMenu key="account" user={currentUser} />]}
      />
      <Container my="4" px="3">
        {currentUser?.role !== 'admin' ? (
          <Text>Administrator access is required.</Text>
        ) : (
          <Flex direction="column" gap="4">
            <div>
              <Heading size="6">User support</Heading>
              <Text as="p" color="gray" size="2" mt="1">
                Find a user, inspect their trips, and recover deleted content.
              </Text>
            </div>
            <Callout.Root color="amber" size="1">
              <Callout.Text>
                Access to other users' trips is audited. Deleted accounts and
                content remain recoverable.
              </Callout.Text>
            </Callout.Root>
            {error ? (
              <Callout.Root color="red" role="alert">
                <Callout.Text>{error}</Callout.Text>
              </Callout.Root>
            ) : null}
            <Tabs.Root defaultValue="users">
              <Tabs.List>
                <Tabs.Trigger value="users">Users & trips</Tabs.Trigger>
                <Tabs.Trigger value="activity">Audit history</Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="users" mt="4">
                <div className={styles.workspace}>
                  <section className={styles.panel} aria-label="Find users">
                    <Heading size="4" mb="3">
                      Users
                    </Heading>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (busy) return;
                        setSubmittedSearch(search);
                        selectUser(undefined);
                      }}
                    >
                      <Flex gap="2">
                        <TextField.Root
                          className={styles.search}
                          aria-label="Search users by handle or email"
                          placeholder="Handle or email"
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                        />
                        <Button type="submit" disabled={busy}>
                          Search
                        </Button>
                      </Flex>
                    </form>
                    <Text as="p" size="1" color="gray" my="3">
                      Up to 30 matches, including deleted accounts.
                    </Text>
                    <div className={styles.userList}>
                      {users.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          className={styles.userRow}
                          aria-pressed={selectedUser?.id === user.id}
                          disabled={busy}
                          onClick={() => selectUser(user)}
                        >
                          <Flex align="center" justify="between" gap="2">
                            <Text weight="medium">{user.handle}</Text>
                            {user.role === 'admin' ? (
                              <Badge>Admin</Badge>
                            ) : null}
                            {user.deletedAt ? (
                              <Badge color="red">Deleted</Badge>
                            ) : null}
                          </Flex>
                          <Text
                            as="p"
                            size="1"
                            color="gray"
                            className={styles.wrap}
                          >
                            {user.email ?? 'Guest account'}
                          </Text>
                        </button>
                      ))}
                      {usersLoading ? (
                        <Text size="2" color="gray" role="status">
                          Loading users…
                        </Text>
                      ) : null}
                      {!usersLoading && users.length === 0 ? (
                        <Text size="2" color="gray">
                          No matching users.
                        </Text>
                      ) : null}
                    </div>
                  </section>
                  <div className={styles.detail}>
                    {!selectedUser ? (
                      <div className={styles.empty}>
                        <Heading size="4">Select a user to get started</Heading>
                        <Text as="p" size="2" color="gray" mt="2">
                          Their trips and account details will appear here.
                        </Text>
                      </div>
                    ) : (
                      <>
                        <section
                          className={styles.panel}
                          aria-label="User trips"
                        >
                          <Flex
                            align="start"
                            justify="between"
                            gap="3"
                            mb="4"
                            wrap="wrap"
                          >
                            <div>
                              <Flex align="center" gap="2" wrap="wrap">
                                <Heading size="4">
                                  {selectedUser.handle}
                                </Heading>
                                {selectedUser.deletedAt ? (
                                  <Badge color="red">Deleted account</Badge>
                                ) : null}
                                {selectedUser.role === 'admin' ? (
                                  <Badge>Admin</Badge>
                                ) : null}
                              </Flex>
                              <Text
                                as="p"
                                size="2"
                                color="gray"
                                mt="1"
                                className={styles.wrap}
                              >
                                {selectedUser.email ?? 'Guest account'}
                              </Text>
                            </div>
                            {selectedUser.role !== 'admin' ? (
                              <DropdownMenu.Root>
                                <DropdownMenu.Trigger>
                                  <Button variant="outline" disabled={busy}>
                                    Account actions <DropdownMenu.TriggerIcon />
                                  </Button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Content>
                                  <DropdownMenu.Item
                                    color={
                                      selectedUser.deletedAt ? 'green' : 'red'
                                    }
                                    onSelect={() => {
                                      if (
                                        selectedUser.deletedAt ||
                                        window.confirm(
                                          'Soft-delete account “' +
                                            selectedUser.handle +
                                            '”? This signs them out. Their trips and content stay recoverable.',
                                        )
                                      )
                                        void changeUser(selectedUser);
                                    }}
                                  >
                                    {selectedUser.deletedAt
                                      ? 'Restore account'
                                      : 'Delete account'}
                                  </DropdownMenu.Item>
                                </DropdownMenu.Content>
                              </DropdownMenu.Root>
                            ) : null}
                          </Flex>
                          <Heading size="3" mb="2">
                            Trips
                          </Heading>
                          {tripsLoading ? (
                            <Text size="2" color="gray" role="status">
                              Loading trips…
                            </Text>
                          ) : null}
                          {!tripsLoading && trips.length === 0 ? (
                            <Text size="2" color="gray">
                              No trips to display.
                            </Text>
                          ) : null}
                          {trips.map((trip) => (
                            <div
                              key={trip.id}
                              className={styles.row}
                              data-selected={selectedTrip?.id === trip.id}
                            >
                              <button
                                type="button"
                                className={styles.tripSelect}
                                disabled={busy}
                                aria-pressed={selectedTrip?.id === trip.id}
                                onClick={() => {
                                  setContent([]);
                                  setContentNextCursor(null);
                                  setSelectedTrip(trip);
                                  setAuditAll(false);
                                }}
                              >
                                <Text weight="medium">
                                  {trip.title || 'Untitled trip'}
                                </Text>
                                <Flex gap="2" mt="1">
                                  {trip.archivedAt ? (
                                    <Badge color="gray">Archived</Badge>
                                  ) : null}
                                  {trip.deletedAt ? (
                                    <Badge color="red">Deleted</Badge>
                                  ) : null}
                                </Flex>
                              </button>
                              <Flex gap="2" align="center" wrap="wrap">
                                {!trip.deletedAt ? (
                                  <Button asChild variant="soft" size="1">
                                    <Link
                                      to={
                                        '/trip/' +
                                        encodeURIComponent(trip.id) +
                                        '/home'
                                      }
                                    >
                                      Open editor
                                    </Link>
                                  </Button>
                                ) : null}
                                <DropdownMenu.Root>
                                  <DropdownMenu.Trigger>
                                    <Button
                                      variant="ghost"
                                      size="1"
                                      disabled={busy}
                                      aria-label={`Actions for ${trip.title}`}
                                    >
                                      Actions <DropdownMenu.TriggerIcon />
                                    </Button>
                                  </DropdownMenu.Trigger>
                                  <DropdownMenu.Content>
                                    <DropdownMenu.Item
                                      color={trip.deletedAt ? 'green' : 'red'}
                                      onSelect={() => {
                                        if (
                                          trip.deletedAt ||
                                          window.confirm(
                                            'Soft-delete trip “' +
                                              trip.title +
                                              '”?',
                                          )
                                        )
                                          void change(
                                            '/api/admin/trips/' +
                                              encodeURIComponent(trip.id),
                                            !!trip.deletedAt,
                                            trip.id,
                                          );
                                      }}
                                    >
                                      {trip.deletedAt
                                        ? 'Restore trip'
                                        : 'Delete trip'}
                                    </DropdownMenu.Item>
                                  </DropdownMenu.Content>
                                </DropdownMenu.Root>
                              </Flex>
                            </div>
                          ))}
                          {tripsNextCursor ? (
                            <Button
                              mt="3"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                void loadMore<AdminTrip>(
                                  '/api/admin/users/' +
                                    encodeURIComponent(selectedUser.id) +
                                    '/trips?cursor=' +
                                    encodeURIComponent(tripsNextCursor),
                                  (items) =>
                                    setTrips((previous) => [
                                      ...previous,
                                      ...items,
                                    ]),
                                  setTripsNextCursor,
                                )
                              }
                            >
                              Load more trips
                            </Button>
                          ) : null}
                        </section>
                        {selectedTrip ? (
                          <section
                            className={styles.panel}
                            aria-label="Trip content"
                          >
                            <Heading size="4">
                              {selectedTrip.title || 'Untitled trip'}
                            </Heading>
                            <Text as="p" size="2" color="gray" mt="1" mb="3">
                              Content and recovery
                            </Text>
                            {selectedTrip.deletedAt ? (
                              <Callout.Root color="amber" mb="3">
                                <Callout.Text>
                                  Restore this trip before changing its content.
                                </Callout.Text>
                              </Callout.Root>
                            ) : null}
                            {contentLoading ? (
                              <Text size="2" color="gray" role="status">
                                Loading content…
                              </Text>
                            ) : null}
                            {!contentLoading && content.length === 0 ? (
                              <Text size="2" color="gray">
                                No content to display.
                              </Text>
                            ) : null}
                            {content.map((item) => (
                              <div
                                key={`${item.entity}:${item.id}`}
                                className={styles.row}
                              >
                                <div className={styles.contentLabel}>
                                  <Text as="p" size="2" className={styles.wrap}>
                                    {item.label || 'Untitled content'}
                                  </Text>
                                  <Flex gap="2" mt="1">
                                    <Badge color="gray">
                                      {item.entity.replaceAll('-', ' ')}
                                    </Badge>
                                    {item.deletedAt ? (
                                      <Badge color="red">Deleted</Badge>
                                    ) : null}
                                  </Flex>
                                </div>
                                <DropdownMenu.Root>
                                  <DropdownMenu.Trigger>
                                    <Button
                                      variant="ghost"
                                      size="1"
                                      disabled={
                                        busy || !!selectedTrip.deletedAt
                                      }
                                      aria-label={`Actions for ${item.label}`}
                                    >
                                      Actions <DropdownMenu.TriggerIcon />
                                    </Button>
                                  </DropdownMenu.Trigger>
                                  <DropdownMenu.Content>
                                    <DropdownMenu.Item
                                      color={item.deletedAt ? 'green' : 'red'}
                                      onSelect={() => {
                                        if (
                                          item.deletedAt ||
                                          window.confirm(
                                            'Soft-delete ' +
                                              item.entity +
                                              ' “' +
                                              item.label +
                                              '”?',
                                          )
                                        )
                                          void change(
                                            '/api/admin/trips/' +
                                              encodeURIComponent(
                                                selectedTrip.id,
                                              ) +
                                              '/content/' +
                                              item.entity +
                                              '/' +
                                              encodeURIComponent(item.id),
                                            !!item.deletedAt,
                                          );
                                      }}
                                    >
                                      {item.deletedAt ? 'Restore' : 'Delete'}
                                    </DropdownMenu.Item>
                                  </DropdownMenu.Content>
                                </DropdownMenu.Root>
                              </div>
                            ))}
                            {contentNextCursor ? (
                              <Button
                                mt="3"
                                variant="outline"
                                disabled={busy}
                                onClick={() =>
                                  void loadMore<AdminContent>(
                                    '/api/admin/trips/' +
                                      encodeURIComponent(selectedTrip.id) +
                                      '/content?cursor=' +
                                      encodeURIComponent(contentNextCursor),
                                    (items) =>
                                      setContent((previous) => [
                                        ...previous,
                                        ...items,
                                      ]),
                                    setContentNextCursor,
                                  )
                                }
                              >
                                Load more content
                              </Button>
                            ) : null}
                          </section>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </Tabs.Content>
              <Tabs.Content value="activity" mt="4">
                <section className={styles.panel} aria-label="Audit history">
                  <Flex
                    justify="between"
                    align="center"
                    gap="3"
                    wrap="wrap"
                    mb="4"
                  >
                    <div>
                      <Heading size="4">Audit history</Heading>
                      <Text as="p" size="2" color="gray" mt="1">
                        {auditTrip
                          ? `Activity for ${auditTrip.title}`
                          : 'Recent activity across all users'}
                      </Text>
                    </div>
                    {selectedTrip ? (
                      <Button
                        variant="outline"
                        disabled={busy || auditLoading}
                        onClick={() => setAuditAll((value) => !value)}
                      >
                        {auditAll ? 'Show selected trip' : 'Show all activity'}
                      </Button>
                    ) : null}
                  </Flex>
                  {auditLoading ? (
                    <Text size="2" color="gray" role="status">
                      Loading activity…
                    </Text>
                  ) : null}
                  {!auditLoading && auditEvents.length === 0 ? (
                    <Text size="2" color="gray">
                      No activity yet.
                    </Text>
                  ) : null}
                  {auditEvents.map((event) => (
                    <div key={event.id} className={styles.auditRow}>
                      <Text as="p" size="1" color="gray">
                        {new Date(Number(event.createdAt)).toLocaleString()}
                      </Text>
                      <div>
                        <Text as="p" size="2">
                          <strong>{event.actorHandle}</strong> · {event.action}{' '}
                          {event.targetType}
                        </Text>
                        {event.details.fields.length > 0 ? (
                          <Text as="p" size="1" color="gray">
                            Changed: {event.details.fields.join(', ')}
                          </Text>
                        ) : null}
                        {event.details.submittedFields?.length &&
                        event.details.fields.length === 0 ? (
                          <Text as="p" size="1" color="gray">
                            Submitted:{' '}
                            {event.details.submittedFields.join(', ')}
                          </Text>
                        ) : null}
                        {event.targetId || event.tripId ? (
                          <details className={styles.auditDetails}>
                            <summary>Record details</summary>
                            <Text as="p" size="1" className={styles.wrap}>
                              {event.targetId
                                ? `Target: ${event.targetId}`
                                : null}
                              {event.tripId ? ` · Trip: ${event.tripId}` : null}
                            </Text>
                          </details>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {auditNextCursor ? (
                    <Button
                      mt="3"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void loadMore<AdminAuditEvent>(
                          '/api/admin/audit-events?' +
                            (auditTrip
                              ? `trip=${encodeURIComponent(auditTrip.id)}&`
                              : '') +
                            'cursor=' +
                            encodeURIComponent(auditNextCursor),
                          (items) =>
                            setAuditEvents((previous) => [
                              ...previous,
                              ...items,
                            ]),
                          setAuditNextCursor,
                        )
                      }
                    >
                      Load more activity
                    </Button>
                  ) : null}
                </section>
              </Tabs.Content>
            </Tabs.Root>
            {busy ? (
              <Flex gap="2" align="center" role="status">
                <Spinner />
                <Text size="2" color="gray">
                  Updating…
                </Text>
              </Flex>
            ) : null}
          </Flex>
        )}
      </Container>
    </>
  );
}
