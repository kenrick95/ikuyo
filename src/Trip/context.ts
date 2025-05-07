import { createContext, useContext } from 'react';
import type { DbTripFull } from './db';

export const TripContext = createContext<DbTripFull | undefined>(undefined);
export const TripProvider = TripContext.Provider;
export const useTrip = () => {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
};
