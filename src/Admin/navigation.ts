import { useSearch } from 'wouter';

// Keep support navigation anchored to the account and search that opened a trip.
export function useAdminLinks(userId?: string) {
  const params = new URLSearchParams(useSearch());
  const search = params.get('search');
  const user = userId ?? params.get('user');
  const context = new URLSearchParams();
  if (search) context.set('search', search);
  const userSearch = context.toString();
  if (user) context.set('user', user);
  const suffix = context.size ? `?${context}` : '';
  return {
    users: `~/admin/users${userSearch ? `?${userSearch}` : ''}`,
    account: user
      ? `~/admin/users/${encodeURIComponent(user)}${userSearch ? `?${userSearch}` : ''}`
      : undefined,
    trip: (id: string) => `~/admin/trips/${encodeURIComponent(id)}${suffix}`,
    activity: (id: string) =>
      `~/admin/trips/${encodeURIComponent(id)}/activity${suffix}`,
    user: (id: string) =>
      `~/admin/users/${encodeURIComponent(id)}${userSearch ? `?${userSearch}` : ''}`,
  };
}
