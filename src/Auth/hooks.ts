import { useLocation } from 'wouter';
import { db } from '../data/db';
import { useCallback } from 'react';
import { ROUTES } from '../routes';

export function useAuthUser() {
  const { user } = db.useAuth();
  const [, setLocation] = useLocation();
  useCallback(() => {
    if (!user) {
      setLocation(ROUTES.Login);
    }
  }, [user, setLocation]);
  return {
    user,
  };
}
