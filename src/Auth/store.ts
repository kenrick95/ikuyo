import type { User as InstantdbUser } from '@instantdb/core';
import { setUser } from '@sentry/react';
import type { StateCreator } from 'zustand';
import { db } from '../data/db';
import type { BoundStoreType } from '../data/store';
import { type DbUser, dbCreateUser, dbUpdateUser } from '../User/db';

export interface UserSlice {
  subscribeUser: () => () => void;

  authUser: undefined | InstantdbUser;
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
      let userUnsubscribe: (() => void) | null = null;

      const authUnsubscribe = db.subscribeAuth(async (authResult) => {
        // Cleanup previous user subscription if exists
        if (userUnsubscribe) {
          userUnsubscribe();
          userUnsubscribe = null;
        }

        if (authResult.error) {
          set(() => ({
            authUser: undefined,
            authUserLoading: false,
            authUserError: authResult.error.message,
          }));
        } else if (authResult.user) {
          // authResult.user.id is $users namespace id
          // this is different from id in our user table

          // User is logged in
          set(() => ({
            authUser: authResult.user,
            authUserError: null,
            // authUserLoading remains true until user data is loaded
          }));
          if (process.env.SENTRY_ENABLED) {
            setUser({
              id: authResult.user.id,
              email: authResult.user.email ?? undefined,
            });
          }

          const userEmail = authResult.user.email;
          if (!userEmail) {
            // Guest user - no email
            // TODO: support guest user in the future, at the moment we require email to identify users
            set(() => ({
              currentUser: undefined,
              authUserLoading: false,
            }));
            return;
          }

          try {
            const [
              { data: userDataUsingAuthUserId },
              { data: userDataUsingEmail },
            ] = await Promise.all([
              db.queryOnce({
                user: {
                  $: {
                    where: {
                      // This will only succeed if they are linked
                      '$users.id': authResult.user.id,
                    },
                    limit: 1,
                  },
                },
              }),
              db.queryOnce({
                user: {
                  $: {
                    where: {
                      // Fallback to link by email
                      email: userEmail,
                    },
                    limit: 1,
                  },
                },
              }),
            ]);

            console.log(
              'Fetched user data using auth user id:',
              authResult.user.id,
              userDataUsingAuthUserId,
            );
            console.log(
              'Fetched user data using user email:',
              userEmail,
              userDataUsingEmail,
            );
            const state = get();
            if (
              !userDataUsingAuthUserId?.user ||
              userDataUsingAuthUserId.user.length === 0
            ) {
              // $user is not linked with user, could either mean:
              // 1. New user - no entry in user table
              // 2. Existing user but not activated - entry in user table with activated=false

              const defaultHandle = userEmail
                .toLowerCase()
                .replace(/[@.]/g, '_');

              const { id: newUserId } = userDataUsingEmail.user?.[0].id
                ? await dbUpdateUser({
                    id: userDataUsingEmail.user?.[0].id,
                    handle:
                      userDataUsingEmail.user?.[0].handle || defaultHandle,
                    email: userEmail,
                    activated: true,
                    defaultUserNamespaceId: authResult.user.id,
                  })
                : await dbCreateUser({
                    handle: defaultHandle,
                    email: userEmail,
                    defaultUserNamespaceId: authResult.user.id,
                  });

              const user = (
                await db.queryOnce({
                  user: {
                    $: {
                      where: {
                        id: newUserId,
                      },
                      limit: 1,
                    },
                  },
                })
              ).data?.user?.[0] as DbUser | undefined;
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
                  children: `Hello ${userEmail}. Account handle is set as ${defaultHandle}`,
                },
                close: {},
              });
            } else if (userDataUsingAuthUserId.user.length > 0) {
              // Exists on both $users and user table
              if (!userDataUsingAuthUserId.user[0].activated) {
                // User exists but not activated
                // Activate user flow
                const defaultHandle = userEmail
                  .toLowerCase()
                  .replace(/[@.]/g, '_');
                const userId = userDataUsingAuthUserId.user[0].id;
                await dbUpdateUser({
                  id: userDataUsingAuthUserId.user[0].id,
                  handle:
                    userDataUsingAuthUserId.user[0].handle || defaultHandle,
                  email: userEmail,
                  activated: true,
                  defaultUserNamespaceId: authResult.user.id,
                });
                const user = (
                  await db.queryOnce({
                    user: {
                      $: {
                        where: {
                          id: userId,
                        },
                        limit: 1,
                      },
                    },
                  })
                ).data?.user?.[0] as DbUser | undefined;
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
              } else {
                // Existing activated user flow
                const userHandle = userDataUsingAuthUserId.user[0].handle;
                const user = userDataUsingAuthUserId.user[0] satisfies DbUser;

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
            }

            // Subscribe for user updates
            userUnsubscribe = db.subscribeQuery(
              {
                user: {
                  $: {
                    where: {
                      '$users.id': authResult.user.id,
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
            );
          } catch (error) {
            console.error('Error fetching user data', error);
            set(() => ({
              authUserLoading: false,
              authUserError: (error as Error).message || 'Unknown error',
            }));
          }
        } else {
          // User is logged out
          set(() => ({
            currentUser: undefined,
            authUser: undefined,
            authUserLoading: false,
            authUserError: null,
          }));
        }
      });

      return () => {
        authUnsubscribe();
        if (userUnsubscribe) {
          userUnsubscribe();
        }
      };
    },
    setCurrentUser: (user) => {
      set(() => ({
        currentUser: user,
      }));
    },
  };
};
