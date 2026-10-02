import {
  Badge,
  Button,
  Callout,
  Container,
  Flex,
  Heading,
  Spinner,
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

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    let active = true;
    void get<AdminUser[]>(
      `/api/admin/users?search=${encodeURIComponent(submittedSearch)}`,
    )
      .then((result) => {
        if (active) setUsers(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(String(reason));
      });
    return () => {
      active = false;
    };
  }, [currentUser?.role, submittedSearch]);

  useEffect(() => {
    if (!selectedUser) return;
    let active = true;
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
      });
    return () => {
      active = false;
    };
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedTrip) return;
    let active = true;
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
      });
    return () => {
      active = false;
    };
  }, [selectedTrip]);

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    let active = true;
    const filter = new URLSearchParams({ refresh: String(auditRefresh) });
    if (selectedTrip) filter.set('trip', selectedTrip.id);
    void get<CursorPage<AdminAuditEvent>>(`/api/admin/audit-events?${filter}`)
      .then((result) => {
        if (active) {
          setAuditEvents(result.data);
          setAuditNextCursor(result.nextCursor);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(String(reason));
      });
    return () => {
      active = false;
    };
  }, [currentUser?.role, selectedTrip, auditRefresh]);

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
      <Container my="4">
        {currentUser?.role !== 'admin' ? (
          <Text>Administrator access is required.</Text>
        ) : (
          <Flex direction="column" gap="4">
            <Callout.Root color="amber">
              <Callout.Text>
                Admin mode can access and change other users' trips. Deleted
                data stays recoverable here.
              </Callout.Text>
            </Callout.Root>
            {error ? <Text color="red">{error}</Text> : null}
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
                  aria-label="Search users by handle or email"
                  placeholder="Search users by handle or email"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <Button type="submit" disabled={busy}>
                  Search
                </Button>
              </Flex>
            </form>
            <Heading size="4">Users</Heading>
            {users.map((user) => (
              <Flex key={user.id} align="center" gap="2" wrap="wrap">
                <Button
                  variant={selectedUser?.id === user.id ? 'solid' : 'outline'}
                  disabled={busy}
                  onClick={() => selectUser(user)}
                >
                  {user.handle} {user.email ? `(${user.email})` : '(guest)'}
                </Button>
                {user.role === 'admin' ? <Badge>Admin</Badge> : null}
                {user.deletedAt ? <Badge color="red">Deleted</Badge> : null}
                {user.role !== 'admin' ? (
                  <Button
                    color={user.deletedAt ? 'green' : 'red'}
                    variant="soft"
                    disabled={busy}
                    onClick={() => {
                      if (
                        user.deletedAt ||
                        window.confirm(
                          `Soft-delete account “${user.handle}”? This signs them out. Their trips and content stay recoverable.`,
                        )
                      ) {
                        void changeUser(user);
                      }
                    }}
                  >
                    {user.deletedAt ? 'Restore account' : 'Delete account'}
                  </Button>
                ) : null}
              </Flex>
            ))}
            {selectedUser ? (
              <>
                <Heading size="4">Trips for {selectedUser.handle}</Heading>
                {trips.map((trip) => (
                  <Flex key={trip.id} align="center" gap="2" wrap="wrap">
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setContent([]);
                        setContentNextCursor(null);
                        setSelectedTrip(trip);
                      }}
                    >
                      {trip.title}
                    </Button>
                    {trip.archivedAt ? <Badge>Archived</Badge> : null}
                    {trip.deletedAt ? <Badge color="red">Deleted</Badge> : null}
                    {!trip.deletedAt ? (
                      <Link to={`/trip/${encodeURIComponent(trip.id)}/home`}>
                        Open editor
                      </Link>
                    ) : null}
                    <Button
                      color={trip.deletedAt ? 'green' : 'red'}
                      variant="soft"
                      disabled={busy}
                      onClick={() => {
                        if (
                          trip.deletedAt ||
                          window.confirm(`Soft-delete trip “${trip.title}”?`)
                        ) {
                          void change(
                            `/api/admin/trips/${encodeURIComponent(trip.id)}`,
                            !!trip.deletedAt,
                            trip.id,
                          );
                        }
                      }}
                    >
                      {trip.deletedAt ? 'Restore trip' : 'Delete trip'}
                    </Button>
                  </Flex>
                ))}
                {tripsNextCursor ? (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true);
                      void get<CursorPage<AdminTrip>>(
                        `/api/admin/users/${encodeURIComponent(selectedUser.id)}/trips?cursor=${encodeURIComponent(tripsNextCursor)}`,
                      )
                        .then((page) => {
                          setTrips((previous) => [...previous, ...page.data]);
                          setTripsNextCursor(page.nextCursor);
                        })
                        .catch((reason: unknown) => setError(String(reason)))
                        .finally(() => setBusy(false));
                    }}
                  >
                    Load more trips
                  </Button>
                ) : null}
              </>
            ) : null}
            {selectedTrip ? (
              <>
                <Heading size="4">Content in {selectedTrip.title}</Heading>
                {content.length === 0 ? <Text>No content found.</Text> : null}
                {content.map((item) => (
                  <Flex
                    key={`${item.entity}:${item.id}`}
                    align="center"
                    gap="2"
                    wrap="wrap"
                  >
                    <Badge>{item.entity}</Badge>
                    <Text>{item.label}</Text>
                    {item.deletedAt ? <Badge color="red">Deleted</Badge> : null}
                    <Button
                      size="1"
                      color={item.deletedAt ? 'green' : 'red'}
                      variant="soft"
                      disabled={busy || !!selectedTrip.deletedAt}
                      onClick={() => {
                        if (
                          item.deletedAt ||
                          window.confirm(
                            `Soft-delete ${item.entity} “${item.label}”?`,
                          )
                        ) {
                          void change(
                            `/api/admin/trips/${encodeURIComponent(selectedTrip.id)}/content/${item.entity}/${encodeURIComponent(item.id)}`,
                            !!item.deletedAt,
                          );
                        }
                      }}
                    >
                      {item.deletedAt ? 'Restore' : 'Delete'}
                    </Button>
                  </Flex>
                ))}
                {contentNextCursor ? (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true);
                      void get<CursorPage<AdminContent>>(
                        `/api/admin/trips/${encodeURIComponent(selectedTrip.id)}/content?cursor=${encodeURIComponent(contentNextCursor)}`,
                      )
                        .then((page) => {
                          setContent((previous) => [...previous, ...page.data]);
                          setContentNextCursor(page.nextCursor);
                        })
                        .catch((reason: unknown) => setError(String(reason)))
                        .finally(() => setBusy(false));
                    }}
                  >
                    Load more content
                  </Button>
                ) : null}
              </>
            ) : null}
            <Heading size="4">
              {selectedTrip
                ? `Audit history for ${selectedTrip.title}`
                : 'Recent admin activity'}
            </Heading>
            {selectedTrip ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setSelectedTrip(undefined)}
              >
                Show all admin activity
              </Button>
            ) : null}
            {auditEvents.length === 0 ? <Text>No activity yet.</Text> : null}
            {auditEvents.map((event) => (
              <Text key={event.id} size="2">
                {new Date(Number(event.createdAt)).toLocaleString()} ·{' '}
                {event.actorHandle} · {event.action} {event.targetType}
                {event.targetId ? ` ${event.targetId}` : ''}
                {event.details.fields.length > 0
                  ? ` · changed: ${event.details.fields.join(', ')}`
                  : null}
                {event.details.submittedFields?.length &&
                event.details.fields.length === 0
                  ? ` · submitted: ${event.details.submittedFields.join(', ')}`
                  : null}
                {event.tripId && !selectedTrip
                  ? ` · trip ${event.tripId}`
                  : null}
              </Text>
            ))}
            {auditNextCursor ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  const filter = selectedTrip
                    ? `trip=${encodeURIComponent(selectedTrip.id)}&`
                    : '';
                  setBusy(true);
                  void get<CursorPage<AdminAuditEvent>>(
                    `/api/admin/audit-events?${filter}cursor=${encodeURIComponent(auditNextCursor)}`,
                  )
                    .then((page) => {
                      setAuditEvents((previous) => [...previous, ...page.data]);
                      setAuditNextCursor(page.nextCursor);
                    })
                    .catch((reason: unknown) => setError(String(reason)))
                    .finally(() => setBusy(false));
                }}
              >
                Load more activity
              </Button>
            ) : null}
            {busy ? <Spinner /> : null}
          </Flex>
        )}
      </Container>
    </>
  );
}
