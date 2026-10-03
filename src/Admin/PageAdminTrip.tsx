import { Badge, Button, Callout, Flex, Heading, Text } from '@radix-ui/themes';
import { Link } from 'wouter';
import { LoadState, RecordActions } from './components';
import {
  type AdminContent,
  type AdminTrip,
  useAdminPage,
  useAdminResource,
} from './data';
import { useAdminLinks } from './navigation';
import styles from './PageAdmin.module.css';

const contentLabels: Record<string, string> = {
  activities: 'Activities',
  accommodations: 'Accommodations',
  macroplans: 'Plans',
  expenses: 'Expenses',
  'task-lists': 'Task lists',
  tasks: 'Tasks',
  'comment-groups': 'Discussions',
  comments: 'Comments',
};

export default function PageAdminTrip({ id }: { id: string }) {
  const path = `/api/admin/trips/${encodeURIComponent(id)}`;
  const links = useAdminLinks();
  const trip = useAdminResource<AdminTrip>(path);
  const content = useAdminPage<AdminContent>(`${path}/content`);
  const groups = Map.groupBy(content.data?.data ?? [], (item) => item.entity);
  return (
    <section className={styles.panel} aria-label="Trip content">
      <Link to={links.account ?? links.users}>
        {links.account ? '← User’s trips' : '← Users'}
      </Link>
      <LoadState
        loading={trip.loading}
        error={trip.error}
        onRetry={trip.reload}
      />
      {trip.data ? (
        <>
          <Flex justify="between" align="start" gap="3" wrap="wrap" my="4">
            <div>
              <Heading as="h1" size="6">
                {trip.data.title || 'Untitled trip'}
              </Heading>
              <Text as="p" color="gray" size="2">
                Content and recovery
              </Text>
              {trip.data.archivedAt ? (
                <Badge color="gray">Archived</Badge>
              ) : null}
            </div>
            <Flex gap="2" wrap="wrap">
              {!trip.data.deletedAt ? (
                <Button asChild variant="soft" size="1">
                  <Link to={`~/trip/${encodeURIComponent(id)}/home`}>
                    Open editor
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" size="1">
                <Link to={links.activity(id)}>Trip activity</Link>
              </Button>
              <RecordActions
                path={path}
                label={trip.data.title}
                deleted={!!trip.data.deletedAt}
                disabled={trip.loading || content.loadingMore}
                onChanged={() => {
                  trip.reload();
                  content.reload();
                }}
              />
            </Flex>
          </Flex>
          {trip.data.deletedAt ? (
            <Callout.Root color="amber" mb="3">
              <Callout.Text>
                Restore this trip before changing its content.
              </Callout.Text>
            </Callout.Root>
          ) : null}
          <LoadState
            loading={content.loading}
            error={content.error}
            onRetry={content.reload}
            empty={
              content.data?.data.length === 0
                ? 'No content to display.'
                : undefined
            }
          />
          {Array.from(groups, ([entity, items]) => (
            <section
              key={entity}
              className={styles.contentGroup}
              aria-label={contentLabels[entity] ?? entity}
            >
              <Heading as="h2" size="3" mb="2">
                {contentLabels[entity] ?? entity}
              </Heading>
              {items.map((item) => (
                <div key={`${item.entity}:${item.id}`} className={styles.row}>
                  <div className={styles.contentLabel}>
                    <Text as="p" size="2" className={styles.wrap}>
                      {item.label || 'Untitled content'}
                    </Text>
                    <Flex gap="2" mt="1">
                      {item.deletedAt ? (
                        <Badge color="red">Deleted</Badge>
                      ) : null}
                    </Flex>
                  </div>
                  <RecordActions
                    path={`${path}/content/${item.entity}/${encodeURIComponent(item.id)}`}
                    label={item.label}
                    deleted={!!item.deletedAt}
                    disabled={
                      !!trip.data?.deletedAt ||
                      trip.loading ||
                      content.loading ||
                      content.loadingMore
                    }
                    onChanged={content.reload}
                  />
                </div>
              ))}
            </section>
          ))}
          {content.data?.nextCursor ? (
            <Button
              mt="3"
              variant="outline"
              disabled={content.loading || content.loadingMore}
              onClick={() => void content.loadMore()}
            >
              {content.loadingMore ? 'Loading…' : 'Load more content'}
            </Button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
