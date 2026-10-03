import { Button, Flex, Heading, Text } from '@radix-ui/themes';
import { Link } from 'wouter';
import { LoadState } from './components';
import { type AdminAuditEvent, useAdminPage } from './data';
import { useAdminLinks } from './navigation';
import styles from './PageAdmin.module.css';

export default function PageAdminActivity({ tripId }: { tripId?: string }) {
  const links = useAdminLinks();
  const events = useAdminPage<AdminAuditEvent>(
    `/api/admin/audit-events${tripId ? `?trip=${encodeURIComponent(tripId)}` : ''}`,
  );
  return (
    <section className={styles.panel} aria-label="Audit history">
      <Flex justify="between" align="start" gap="3" wrap="wrap" mb="4">
        <div>
          <Heading as="h1" size="6">
            {tripId ? 'Trip activity' : 'Audit history'}
          </Heading>
          <Text as="p" size="2" color="gray" mt="1">
            {tripId
              ? 'Admin access and changes for this trip.'
              : 'Recent activity across all users.'}
          </Text>
        </div>
        {tripId ? (
          <Flex gap="2" wrap="wrap">
            <Button asChild variant="outline">
              <Link to={links.trip(tripId)}>Back to trip</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="~/admin/activity">Show all activity</Link>
            </Button>
          </Flex>
        ) : null}
      </Flex>
      <LoadState
        loading={events.loading}
        error={events.error}
        onRetry={events.reload}
        empty={events.data?.data.length === 0 ? 'No activity yet.' : undefined}
      />
      {events.data?.data.map((event) => (
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
                Submitted: {event.details.submittedFields.join(', ')}
              </Text>
            ) : null}
            {event.targetId || event.tripId ? (
              <details className={styles.auditDetails}>
                <summary>Record details</summary>
                <Text as="p" size="1" className={styles.wrap}>
                  {event.targetId ? `Target: ${event.targetId}` : null}
                  {event.tripId ? (
                    <>
                      {' '}
                      ·{' '}
                      <Link to={links.trip(event.tripId)}>
                        Trip {event.tripId}
                      </Link>
                    </>
                  ) : null}
                </Text>
              </details>
            ) : null}
          </div>
        </div>
      ))}
      {events.data?.nextCursor ? (
        <Button
          mt="3"
          variant="outline"
          disabled={events.loading || events.loadingMore}
          onClick={() => void events.loadMore()}
        >
          {events.loadingMore ? 'Loading…' : 'Load more activity'}
        </Button>
      ) : null}
    </section>
  );
}
