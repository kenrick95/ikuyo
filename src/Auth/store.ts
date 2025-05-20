import { useEffect } from 'react';
import { useLocation } from 'wouter';
import type { StateCreator } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { db, dbUpsertUser } from '../data/db';
import { type BoundStoreType, useBoundStore } from '../data/store';
import type { DbUser } from '../data/types';
import { RouteLogin, UnauthenticatedRoutes } from '../Routes/routes';

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
      return db.subscribeAuth(async (authResult) => {
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
            authUserLoading: false,
            authUserError: null,
          }));

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
          set(() => {
            return {
              currentUser: user,
            };
          });

          const state = get();
          if (userData.user.length === 0 || !userData.user[0].activated) {
            // Create new user if not exist, or alr exist but not yet activated
            const defaultHandle = userEmail.toLowerCase().replace(/[@.]/g, '_');
            await dbUpsertUser({
              handle: defaultHandle,
              email: userEmail,
              activated: true,
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
            state.publishToast({
              root: {},
              title: { children: `Welcome back ${userHandle}!` },
              close: {},
            });
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
    },
    setCurrentUser: (user) => {
      set(() => ({
        currentUser: user,
      }));
    },
  };
};

export function useCurrentUser() {
  const currentUser = useBoundStore(useShallow((state) => state.currentUser));
  return currentUser;
}
export function useAuthUser() {
  const { authUser, authUserLoading, authUserError } = useBoundStore(
    useShallow((state) => ({
      authUser: state.authUser,
      authUserLoading: state.authUserLoading,
      authUserError: state.authUserError,
    })),
  );
  return { authUser, authUserLoading, authUserError };
}
export function useSubscribeUser() {
  const subscribeUser = useBoundStore((state) => state.subscribeUser);
  useEffect(() => {
    subscribeUser();
  }, [subscribeUser]);
}
export function useRedirectUnauthenticatedRoutes() {
  const { authUser, authUserLoading } = useAuthUser();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!authUserLoading && !authUser) {
      if (
        UnauthenticatedRoutes.some((route) => {
          return `~${location}` === route.asRootRoute();
        })
      ) {
        // nothing
      } else {
        setLocation(RouteLogin.asRootRoute());
      }
    }
  }, [authUserLoading, location, authUser, setLocation]);
}
