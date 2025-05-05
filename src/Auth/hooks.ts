import { useEffect } from 'react';
import { useLocation } from 'wouter';
import type { StateCreator } from 'zustand';
import { db } from '../data/db';
import { useBoundStore, type BoundStoreType } from '../data/store';
import type { DbUser } from '../data/types';
import { ROUTES, asRootRoute } from '../Routes/routes';

export function useAuthUser() {
  const setCurrentUser = useBoundStore((state) => state.setCurrentUser);
  const { user, isLoading } = db.useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation(asRootRoute(ROUTES.Login));
    }
    if (!isLoading && user) {
      (async () => {
        const userEmail = user?.email;
        if (userEmail) {
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
          setCurrentUser(user);
        }
      })();
    }
  }, [isLoading, user, setLocation, setCurrentUser]);
  return {
    user,
    isLoading,
  };
}

export interface UserSlice {
  currentUser: DbUser | undefined;
  setCurrentUser: (user: DbUser | undefined) => void;
}

export const createUserSlice: StateCreator<
  BoundStoreType,
  [],
  [],
  UserSlice
> = (set) => {
  return {
    currentUser: undefined,
    setCurrentUser: (user) => {
      set(() => ({
        currentUser: user,
      }));
    },
  };
};
