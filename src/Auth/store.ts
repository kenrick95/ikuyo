import type { User as InstantdbUser } from '@instantdb/core';
import { setUser } from '@sentry/react';
import type { StateCreator } from 'zustand';
import { db } from '../data/db';
import type { BoundStoreType } from '../data/store';
import { type DbUser, dbCreateUser, dbUpdateUser } from '../User/db';
import { isEmailTakenByOtherUser } from '../User/emailCheck';

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
          const isGuest = !userEmail;

          try {
            // Step 1: Try to find user by auth namespace id link (works for both guest and full users)
            const { data: userDataUsingAuthUserId } = await db.queryOnce({
              user: {
                $: {
                  where: {
                    '$users.id': authResult.user.id,
                  },
                  limit: 1,
                },
              },
            });

            console.log(
              'Fetched user data using auth user id:',
              authResult.user.id,
              userDataUsingAuthUserId,
            );

            const state = get();

            if (
              userDataUsingAuthUserId?.user &&
              userDataUsingAuthUserId.user.length > 0
            ) {
              // User record linked to $users exists
              const existingUser = userDataUsingAuthUserId.user[0];

              if (!existingUser.activated) {
                // User exists but not activated — activate
                const defaultHandle = userEmail
                  ? userEmail.toLowerCase().replace(/[@.]/g, '_')
                  : existingUser.handle ||
                    `guest_${authResult.user.id.slice(0, 12)}`;
                const userId = existingUser.id;
                await dbUpdateUser({
                  id: userId,
                  handle: existingUser.handle || defaultHandle,
                  email: userEmail || undefined,
                  activated: true,
                  defaultUserNamespaceId: authResult.user.id,
                });
                const user = (
                  await db.queryOnce({
                    user: {
                      $: {
                        where: { id: userId },
                        limit: 1,
                      },
                    },
                  })
                ).data?.user?.[0] as DbUser | undefined;
                set(() => ({
                  currentUser: user,
                  authUserLoading: false,
                }));
                state.publishToast({
                  root: { duration: Number.POSITIVE_INFINITY },
                  title: { children: 'Welcome!' },
                  description: {
                    children: isGuest
                      ? `Activated guest account. Handle: ${defaultHandle}`
                      : `Activated account for ${userEmail}. Handle: ${defaultHandle}`,
                  },
                  close: {},
                });
              } else {
                // Existing activated user — welcome back
                const user = existingUser as DbUser;

                // If auth now has email but user record doesn't, persist the email (guest upgrade)
                if (userEmail && !user.email) {
                  const emailTaken = await isEmailTakenByOtherUser(
                    userEmail,
                    user.id,
                  );
                  if (emailTaken) {
                    set(() => ({
                      currentUser: user,
                      authUserLoading: false,
                    }));
                    state.publishToast({
                      root: { duration: Number.POSITIVE_INFINITY },
                      title: { children: 'Upgrade blocked' },
                      description: {
                        children:
                          'This email is already linked to another account. Log in to that account instead.',
                      },
                      close: {},
                    });
                    return;
                  }

                  await dbUpdateUser({
                    id: user.id,
                    email: userEmail,
                    handle: user.handle,
                    activated: true,
                    defaultUserNamespaceId: authResult.user.id,
                  });
                  set(() => ({
                    currentUser: { ...user, email: userEmail },
                    authUserLoading: false,
                  }));
                  state.publishToast({
                    root: { duration: Number.POSITIVE_INFINITY },
                    title: { children: 'Account upgraded!' },
                    description: {
                      children: `Your account is now linked to ${userEmail}. You can now change your handle and share trips.`,
                    },
                    close: {},
                  });
                } else {
                  set(() => ({
                    currentUser: user,
                    authUserLoading: false,
                  }));
                  state.publishToast({
                    root: {},
                    title: {
                      children: `Welcome back ${user.handle}!`,
                    },
                    close: {},
                  });
                }
              }
            } else {
              // No user linked to auth id — need to create or link

              if (userEmail) {
                // Full user path: check if user exists by email
                const { data: userDataUsingEmail } = await db.queryOnce({
                  user: {
                    $: {
                      where: { email: userEmail },
                      limit: 1,
                    },
                  },
                });

                console.log(
                  'Fetched user data using user email:',
                  userEmail,
                  userDataUsingEmail,
                );

                const defaultHandle = userEmail
                  .toLowerCase()
                  .replace(/[@.]/g, '_');

                const { id: newUserId } = userDataUsingEmail.user?.[0]?.id
                  ? await dbUpdateUser({
                      id: userDataUsingEmail.user[0].id,
                      handle:
                        userDataUsingEmail.user[0].handle || defaultHandle,
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
                        where: { id: newUserId },
                        limit: 1,
                      },
                    },
                  })
                ).data?.user?.[0] as DbUser | undefined;
                set(() => ({
                  currentUser: user,
                  authUserLoading: false,
                }));
                state.publishToast({
                  root: { duration: Number.POSITIVE_INFINITY },
                  title: { children: 'Welcome!' },
                  description: {
                    children: `Hello ${userEmail}. Account handle is set as ${defaultHandle}`,
                  },
                  close: {},
                });
              } else {
                // Guest user path: create new app user without email
                const defaultHandle = `guest_${authResult.user.id.slice(0, 12)}`;
                const { id: newUserId } = await dbCreateUser({
                  handle: defaultHandle,
                  defaultUserNamespaceId: authResult.user.id,
                });

                const user = (
                  await db.queryOnce({
                    user: {
                      $: {
                        where: { id: newUserId },
                        limit: 1,
                      },
                    },
                  })
                ).data?.user?.[0] as DbUser | undefined;
                set(() => ({
                  currentUser: user,
                  authUserLoading: false,
                }));
                state.publishToast({
                  root: { duration: Number.POSITIVE_INFINITY },
                  title: { children: 'Welcome, Guest!' },
                  description: {
                    children: `You're using a guest account (${defaultHandle}). Sign up anytime to keep your data.`,
                  },
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
