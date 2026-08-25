import { setUser } from '@sentry/react';
import type { StateCreator } from 'zustand';
import { get as apiGet } from '../data/apiClient';
import type { BoundStoreType } from '../data/store';
import type { DbUser } from '../User/db';

/** The authenticated user identity (Laravel session). */
export type AuthUser = {
  id: string;
  email: string | null;
};

export interface UserSlice {
  subscribeUser: () => () => void;

  authUser: undefined | AuthUser;
  authUserLoading: boolean;
  authUserError: string | null;

  currentUser: DbUser | undefined;
  setCurrentUser: (user: DbUser | undefined) => void;
  refreshCurrentUser: () => Promise<void>;
  /** Forget the cached user + all cached trip data (call on logout). */
  clearSession: () => void;
}

export const createUserSlice: StateCreator<
  BoundStoreType,
  [],
  [],
  UserSlice
> = (set) => {
  return {
    authUser: undefined,
    authUserLoading: true,
    authUserError: null,

    currentUser: undefined,
    subscribeUser: () => {
      let disposed = false;
      void apiGet<{ user: DbUser | null }>('/api/auth/me')
        .then(({ user }) => {
          if (disposed) return;
          set(() => ({
            authUser: user
              ? { id: user.id, email: user.email ?? null }
              : undefined,
            currentUser: user ?? undefined,
            authUserLoading: false,
            authUserError: null,
          }));
          if (process.env.SENTRY_ENABLED && user) {
            setUser({
              id: user.id,
              email: user.email ?? undefined,
            });
          }
        })
        .catch((error: unknown) => {
          if (disposed) return;
          set(() => ({
            authUser: undefined,
            currentUser: undefined,
            authUserLoading: false,
            authUserError:
              error instanceof Error ? error.message : 'Unable to load session',
          }));
        });
      return () => {
        disposed = true;
      };
    },
    setCurrentUser: (user) => {
      set(() => ({
        currentUser: user,
      }));
    },
    refreshCurrentUser: async () => {
      const response = await apiGet<{ user: DbUser | null }>('/api/auth/me');
      set(() => ({ currentUser: response.user ?? undefined }));
    },
    clearSession: () => {
      // Wipe the cached user and every cached domain collection so a different
      // user logging in on the same browser never sees the previous session's
      // trips. Also remove the persisted localStorage snapshot.
      set(() => ({
        currentUser: undefined,
        authUser: undefined,
        trip: {},
        tripLocalState: {},
        comment: {},
        commentGroup: {},
        commentUser: {},
        macroplan: {},
        expense: {},
        accommodation: {},
        activity: {},
        trips: {},
        tripUser: {},
        task: {},
        taskList: {},
      }));
      try {
        localStorage.removeItem('ikuyo-storage');
        sessionStorage.removeItem('ikuyo-storage');
      } catch {
        // Storage may be unavailable (private mode); the in-memory reset above
        // still protects against cross-user trip leakage.
      }
    },
  };
};
