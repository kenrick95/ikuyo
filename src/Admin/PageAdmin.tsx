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
    void get<AdminContent[]>(
      `/api/admin/trips/${encodeURIComponent(selectedTrip.id)}/content`,
    )
      .then((result) => {
        if (active) setContent(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(String(reason));
      });
    return () => {
      active = false;
    };
  }, [selectedTrip]);

  async function refresh() {
    if (!selectedUser) return;
    const nextTrips = await get<CursorPage<AdminTrip>>(
      `/api/admin/users/${encodeURIComponent(selectedUser.id)}/trips`,
    );
    setTrips((previous) => [
      ...nextTrips.data,
      ...previous.filter(
        (trip) => !nextTrips.data.some((next) => next.id === trip.id),
      ),
    ]);
    setTripsNextCursor(nextTrips.nextCursor);
    if (selectedTrip) {
      const updatedTrip = nextTrips.data.find(
        (trip) => trip.id === selectedTrip.id,
      );
      if (updatedTrip) setSelectedTrip(updatedTrip);
      setContent(
        await get<AdminContent[]>(
          `/api/admin/trips/${encodeURIComponent(selectedTrip.id)}/content`,
        ),
      );
    }
  }

  async function change(path: string, restore: boolean) {
    setBusy(true);
    setError(undefined);
    try {
      if (restore) await postMutation(`${path}/restore`, {});
      else await deleteMutation(path);
      await refresh();
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
                setSubmittedSearch(search);
                setSelectedUser(undefined);
                setSelectedTrip(undefined);
              }}
            >
              <Flex gap="2">
                <TextField.Root
                  aria-label="Search users by handle or email"
                  placeholder="Search users by handle or email"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <Button type="submit">Search</Button>
              </Flex>
            </form>
            <Heading size="4">Users</Heading>
            {users.map((user) => (
              <Flex key={user.id} align="center" gap="2" wrap="wrap">
                <Button
                  variant={selectedUser?.id === user.id ? 'solid' : 'outline'}
                  onClick={() => {
                    setSelectedUser(user);
                    setSelectedTrip(undefined);
                  }}
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
                      onClick={() => setSelectedTrip(trip)}
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
              </>
            ) : null}
            {busy ? <Spinner /> : null}
          </Flex>
        )}
      </Container>
    </>
  );
}
