import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useBoundStore, useDeepBoundStore } from '../data/store';
import { RouteLogin, UnauthenticatedRoutes } from '../Routes/routes';

export function useCurrentUser() {
  const currentUser = useDeepBoundStore((state) => state.currentUser);
  return currentUser;
}
export function useAuthUser() {
  const { authUser, authUserLoading, authUserError } = useDeepBoundStore(
    (state) => ({
      authUser: state.authUser,
      authUserLoading: state.authUserLoading,
      authUserError: state.authUserError,
    }),
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
