import { id } from '@instantdb/core';
import { db } from '../data/db';

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
  id: userId,
  region,
  currency,
  timeZone,
}: {
  id: string;
  region?: string;
  currency?: string;
  timeZone?: string;
}) {
  const attrs: Record<string, unknown> = {
    lastUpdatedAt: Date.now(),
  };
  if (region !== undefined) attrs.preferredRegion = region;
  if (currency !== undefined) attrs.preferredCurrency = currency;
  if (timeZone !== undefined) attrs.preferredTimeZone = timeZone;
  return db.transact(db.tx.user[userId].merge(attrs));
}

export async function dbCreateUser({
  email,
  handle,
  defaultUserNamespaceId,
}: {
  email?: string;
  handle: string;
  /** 'id' in $user table/namespace */
  defaultUserNamespaceId: string;
}) {
  const newUserId = id();
  const now = Date.now();
  const baseAttrs = {
    handle,
    createdAt: now,
    lastUpdatedAt: now,
    activated: true,
    lastLoginAt: now,
  } satisfies Omit<DbUser, 'id' | 'email'>;
  const attrs = email ? { ...baseAttrs, email } : baseAttrs;
  const result = await db.transact(
    db.tx.user[newUserId].create(attrs).link({
      $users: defaultUserNamespaceId,
    }),
  );
  return {
    id: newUserId,
    result,
  };
}

export async function dbUpdateUser({
  id: userId,
  email,
  handle,
  activated,
  defaultUserNamespaceId,
  lastLoginAt,
}: {
  id: string;
  email: string | undefined;
  handle: string;
  activated: boolean;
  defaultUserNamespaceId: string;
  lastLoginAt: number | undefined;
}) {
  const attrs: Record<string, unknown> = {
    handle,
    activated,
    lastUpdatedAt: Date.now(),
    lastLoginAt,
  };
  if (email !== undefined) {
    attrs.email = email;
  }
  const result = await db.transact(
    db.tx.user[userId].update(attrs, { upsert: false }).link({
      $users: defaultUserNamespaceId,
    }),
  );
  return {
    id: userId,
    result,
  };
}
