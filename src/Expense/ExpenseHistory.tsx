import { Button, Flex, Text } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { get } from '../data/apiClient';

type HistoryItem = {
  id: number;
  operation: string;
  createdAt: number;
  changes: { field: string; before: string; after: string }[];
};
type HistoryPage = { items: HistoryItem[]; nextCursor: number | null };
const operations: Record<string, string> = {
  'expense.save': 'Expense saved',
  'expense.delete': 'Expense deleted',
  'payment.create': 'Payment recorded',
  'payment.void': 'Payment voided',
  'person.add': 'Person added',
  'person.update': 'Person updated',
};

export function ExpenseHistory({
  tripId,
  timeZone,
}: {
  tripId: string;
  timeZone: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState<HistoryPage>({
    items: [],
    nextCursor: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const prefix = `/api/trips/${encodeURIComponent(tripId)}/expense-history`;
  useEffect(() => {
    if (!expanded) return;
    let active = true;
    setLoading(true);
    setError('');
    void get<HistoryPage>(prefix)
      .then((result) => {
        if (active) setPage(result);
      })
      .catch((err) => {
        if (active)
          setError(
            err instanceof Error ? err.message : 'Unable to load activity.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [expanded, prefix]);
  async function more() {
    if (!page.nextCursor || loading) return;
    setLoading(true);
    setError('');
    try {
      const result = await get<HistoryPage>(
        `${prefix}?cursor=${page.nextCursor}`,
      );
      setPage((previous) => ({
        items: [...previous.items, ...result.items],
        nextCursor: result.nextCursor,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load activity.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <details onToggle={(e) => setExpanded(e.currentTarget.open)}>
      <summary>Activity</summary>
      <Flex direction="column" gap="3" mt="3">
        {page.items.map((item) => (
          <Flex key={item.id} direction="column" gap="1">
            <Text size="2" weight="medium">
              {operations[item.operation] ?? 'Expense updated'}
            </Text>
            <Text size="1" color="gray">
              {new Date(item.createdAt).toLocaleString(undefined, { timeZone })}
            </Text>
            {item.changes.map((change) => (
              <Text
                size="2"
                key={change.field}
                style={{ overflowWrap: 'anywhere' }}
              >
                {change.field}: {change.before && `${change.before} → `}
                {change.after || 'Removed'}
              </Text>
            ))}
          </Flex>
        ))}
        {loading && (
          <Text size="2" color="gray">
            Loading…
          </Text>
        )}
        {error && (
          <Text size="2" color="red" role="alert">
            {error}
          </Text>
        )}
        {!loading && !error && !page.items.length && (
          <Text size="2" color="gray">
            No activity yet.
          </Text>
        )}
        {page.nextCursor && (
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => void more()}
          >
            Load more
          </Button>
        )}
      </Flex>
    </details>
  );
}
