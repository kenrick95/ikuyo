import { patchMutation, putMutation } from '../data/apiClient';

export type DbUser = {
  id: string;
  handle: string;
  email: string | undefined;
  createdAt: number;
  lastUpdatedAt: number;
  activated: boolean;
  lastLoginAt: number | undefined;
  preferredRegion?: string;
  preferredCurrency?: string;
  preferredTimeZone?: string;
};

export async function dbUpdateUserPreferences({
  region,
  currency,
  timeZone,
}: {
  id?: string;
  region?: string;
  currency?: string;
  timeZone?: string;
}) {
  return putMutation(`/api/users/me/preferences`, {
    region,
    currency,
    timeZone,
  });
}

export async function dbUpdateUser({
  id: _userId,
  email,
  handle,
}: {
  id?: string;
  email?: string | undefined;
  handle?: string;
  activated?: boolean;
  defaultUserNamespaceId?: string;
  lastLoginAt?: number | undefined;
}) {
  return patchMutation<{ id: string }>(`/api/users/me`, { email, handle });
}
