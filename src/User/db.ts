import { id } from '@instantdb/core';
import { db } from '../data/db';

export type DbUser = {
  id: string;
  handle: string;
  email: string | undefined;
  createdAt: number;
  lastUpdatedAt: number;
  activated: boolean;
};

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
  };
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
}: {
  id: string;
  email?: string;
  handle: string;
  activated: boolean;
  defaultUserNamespaceId: string;
}) {
  const attrs: Record<string, unknown> = {
    handle,
    activated,
    lastUpdatedAt: Date.now(),
  };
  if (email) {
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
