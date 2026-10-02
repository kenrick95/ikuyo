import { Badge, Button, Flex, Heading, Text } from '@radix-ui/themes';
import { Link } from 'wouter';
import { LoadState, RecordActions } from './components';
import {
  type AdminTrip,
  type AdminUser,
  useAdminPage,
  useAdminResource,
} from './data';
import { useAdminLinks } from './navigation';
import styles from './PageAdmin.module.css';

export default function PageAdminUser({ id }: { id: string }) {
  const path = `/api/admin/users/${encodeURIComponent(id)}`;
  const links = useAdminLinks(id);
  const user = useAdminResource<AdminUser>(path);
  const trips = useAdminPage<AdminTrip>(`${path}/trips`);
  return (
    <section className={styles.panel} aria-label="User trips">
      <Link to={links.users}>← Users</Link>
      <LoadState
        loading={user.loading}
        error={user.error}
        onRetry={user.reload}
      />
      {user.data ? (
        <>
          <Flex align="start" justify="between" gap="3" my="4" wrap="wrap">
            <div>
              <Heading as="h1" size="6">
                {user.data.handle}
              </Heading>
              <Text as="p" size="2" color="gray" className={styles.wrap}>
                {user.data.email ?? 'Guest account'}
              </Text>
              {user.data.deletedAt ? (
                <Badge color="red">[deleted]</Badge>
              ) : null}
              {user.data.role === 'admin' ? <Badge>Admin</Badge> : null}
            </div>
            {user.data.role !== 'admin' ? (
              <RecordActions
                path={path}
                label={user.data.handle}
                deleted={!!user.data.deletedAt}
                account
                disabled={user.loading}
                onChanged={user.reload}
              />
            ) : null}
          </Flex>
          <Heading as="h2" size="4" mb="2">
            Trips
          </Heading>
          <LoadState
            loading={trips.loading}
            error={trips.error}
            onRetry={trips.reload}
            empty={
              trips.data?.data.length === 0 ? 'No trips to display.' : undefined
            }
          />
          {trips.data?.data.map((trip) => (
            <div key={trip.id} className={styles.row}>
              <div className={styles.contentLabel}>
                <Link to={links.trip(trip.id)}>
                  {trip.title || 'Untitled trip'}
                </Link>
                <Flex gap="2" mt="1">
                  {trip.archivedAt ? (
                    <Badge color="gray">Archived</Badge>
                  ) : null}
                  {trip.deletedAt ? <Badge color="red">[deleted]</Badge> : null}
                </Flex>
              </div>
              {!trip.deletedAt ? (
                <Button asChild variant="soft" size="1">
                  <Link to={`~/trip/${encodeURIComponent(trip.id)}/home`}>
                    Open editor
                  </Link>
                </Button>
              ) : null}
            </div>
          ))}
          {trips.data?.nextCursor ? (
            <Button
              mt="3"
              variant="outline"
              disabled={trips.loading || trips.loadingMore}
              onClick={() => void trips.loadMore()}
            >
              {trips.loadingMore ? 'Loading…' : 'Load more trips'}
            </Button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
