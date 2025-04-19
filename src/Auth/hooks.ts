import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { db } from '../data/db';
import { ROUTES } from '../routes';

export function useAuthUser() {
  const { user, isLoading } = db.useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation(ROUTES.Login);
    }
  }, [isLoading, user, setLocation]);
  return {
    user,
    isLoading,
  };
}
