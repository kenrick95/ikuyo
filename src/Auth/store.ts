import { setUser } from '@sentry/react';
import type { StateCreator } from 'zustand';
import { db, dbUpsertUser } from '../data/db';
import type { BoundStoreType } from '../data/store';
import type { DbUser } from '../data/types';

export interface UserSlice {
  subscribeUser: () => () => void;

  authUser: undefined | { id: string; email: string };
  authUserLoading: boolean;
  authUserError: string | null;

  currentUser: DbUser | undefined;
  setCurrentUser: (user: DbUser | undefined) => void;
}

export const createUserSlice: StateCreator<
  BoundStoreType,
  [],
  [],
  UserSlice
> = (set, get) => {
  return {
    authUser: undefined,
    authUserLoading: true,
    authUserError: null,

    currentUser: undefined,
    subscribeUser: () => {
      const unsubscribeFns: (() => void)[] = [];

      unsubscribeFns.push(
        db.subscribeAuth(async (authResult) => {
          if (authResult.error) {
            set(() => ({
              authUser: undefined,
              authUserLoading: false,
              authUserError: authResult.error.message,
            }));
          } else if (authResult.user) {
            // User is logged in
            set(() => ({
              authUser: authResult.user,
              authUserError: null,
            }));
            if (process.env.SENTRY_ENABLED) {
              setUser({
                id: authResult.user.id,
                email: authResult.user.email,
              });
            }

            const userEmail = authResult.user.email;
            const { data: userData } = await db.queryOnce({
              user: {
                $: {
                  where: {
                    email: userEmail,
                  },
                  limit: 1,
                },
              },
            });
            const user = userData.user[0] as DbUser | undefined;

            const state = get();
            if (userData.user.length === 0 || !userData.user[0].activated) {
              // Create new user if not exist, or alr exist but not yet activated
              const defaultHandle = userEmail
                .toLowerCase()
                .replace(/[@.]/g, '_');
              await dbUpsertUser({
                handle: defaultHandle,
                email: userEmail,
                activated: true,
              });
              set(() => {
                return {
                  currentUser: user,
                  authUserLoading: false,
                };
              });
              state.publishToast({
                root: { duration: Number.POSITIVE_INFINITY },
                title: { children: 'Welcome!' },
                description: {
                  children: `Activated account for ${userEmail}. Account handle is set as ${defaultHandle}`,
                },
                close: {},
              });
            } else if (userData.user.length > 0) {
              const userHandle = userData.user[0].handle;
              set(() => {
                return {
                  currentUser: user,
                  authUserLoading: false,
                };
              });
              state.publishToast({
                root: {},
                title: { children: `Welcome back ${userHandle}!` },
                close: {},
              });
            }

            // Subscribe for user updates
            unsubscribeFns.push(
              db.subscribeQuery(
                {
                  user: {
                    $: {
                      where: {
                        email: userEmail,
                      },
                      limit: 1,
                    },
                  },
                },
                (userData) => {
                  const user = userData.data?.user?.[0] as DbUser | undefined;
                  set(() => ({
                    currentUser: user,
                  }));
                },
              ),
            );
          } else {
            // User is logged out
            set(() => ({
              currentUser: undefined,
              authUser: undefined,
              authUserLoading: false,
              authUserError: null,
            }));
          }
        }),
      );

      return () => {
        unsubscribeFns.forEach((fn) => fn());
      };
    },
    setCurrentUser: (user) => {
      set(() => ({
        currentUser: user,
      }));
    },
  };
};
