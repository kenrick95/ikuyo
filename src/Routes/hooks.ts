import type { StateCreator } from 'zustand';
import type { BoundStoreType } from '../data/store';

// Manage the stack of route history in the application
export interface RouteHistorySlice {
  routeHistory: string[];
  pushRouteHistory: (location: string) => void;
  popRouteHistory: () => void;
  // Returns the number history pop to go back to reach the given location, if not available in history, return is -1, and user have to 'push' to history
  getPopCountFromRouteHistory: (location: string) => number;
}

export const createRouteHistorySlice: StateCreator<
  BoundStoreType,
  [],
  [],
  RouteHistorySlice
> = (set, get) => {
  return {
    routeHistory: [],
    pushRouteHistory: (location: string) => {
      set((state) => {
        const routeHistory = [...state.routeHistory, location];
        return { routeHistory };
      });
    },
    popRouteHistory: () => {
      set((state) => {
        const routeHistory = [...state.routeHistory];
        routeHistory.pop();
        return { routeHistory };
      });
    },
    getPopCountFromRouteHistory: (location: string) => {
      const routeHistory = get().routeHistory;
      console.log('getPopCountFromRouteHistory routeHistory ', routeHistory);
      if (routeHistory.length === 0) {
        return -1;
      }
      let cleanedRoute = location;
      if (cleanedRoute.startsWith('~')) {
        // we're in nested route, requesting to navigate to root route
        // remove the first character, so we can find the route in history
        cleanedRoute = cleanedRoute.substring(1);
      }
      const index = routeHistory.indexOf(cleanedRoute);
      if (index === -1) {
        return -1;
      }
      console.log(
        'getPopCountFromRouteHistory',
        index,
        routeHistory,
        cleanedRoute,
        routeHistory.length - index - 1,
      );
      // [0, 1, 2, 3, 4]
      // length = 5, currently at '4'
      // if we're finding '1', we get index = 1, so need to pop 3 times
      return routeHistory.length - index - 1;
    },
  };
};
