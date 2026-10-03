import { useCallback, useEffect, useRef, useState } from 'react';
import { type CursorPage, get } from '../data/apiClient';

export type AdminUser = {
  id: string;
  handle: string;
  email: string | null;
  role: 'user' | 'admin';
  deletedAt: string | null;
};
export type AdminTrip = {
  id: string;
  title: string;
  archivedAt: number | null;
  deletedAt: string | null;
};
export type AdminContent = {
  entity: string;
  id: string;
  label: string;
  deletedAt: string | null;
};
export type AdminAuditEvent = {
  id: number;
  actorHandle: string;
  tripId: string | null;
  targetType: string;
  targetId: string | null;
  action: string;
  details: { fields: string[]; submittedFields?: string[] };
  createdAt: number;
};

// Route pages are keyed by their URL; leaving a page invalidates its requests.
export function useAdminResource<T>(path: string) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const generation = useRef(0);
  const reload = useCallback(() => {
    const request = ++generation.current;
    setLoading(true);
    setError(undefined);
    void get<T>(path)
      .then((result) => {
        if (generation.current === request) setData(result);
      })
      .catch((reason: unknown) => {
        if (generation.current === request) setError(String(reason));
      })
      .finally(() => {
        if (generation.current === request) setLoading(false);
      });
  }, [path]);
  useEffect(() => {
    reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  return {
    data,
    setData,
    loading,
    error,
    setError,
    generation,
    reload,
  };
}

export function useAdminPage<T>(path: string) {
  const resource = useAdminResource<CursorPage<T>>(path);
  const [loadingMore, setLoadingMore] = useState(false);
  async function loadMore() {
    if (!resource.data?.nextCursor || resource.loading || loadingMore) return;
    const request = resource.generation.current;
    setLoadingMore(true);
    resource.setError(undefined);
    try {
      const separator = path.includes('?') ? '&' : '?';
      const page = await get<CursorPage<T>>(
        `${path}${separator}cursor=${encodeURIComponent(resource.data.nextCursor)}`,
      );
      if (request === resource.generation.current) {
        resource.setData((previous) => ({
          ...page,
          data: [...(previous?.data ?? []), ...page.data],
        }));
      }
    } catch (reason) {
      if (request === resource.generation.current)
        resource.setError(String(reason));
    } finally {
      setLoadingMore(false);
    }
  }
  return { ...resource, loadingMore, loadMore };
}
