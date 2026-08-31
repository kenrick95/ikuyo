export const LocationType = {
  Activity: 'activity',
  ActivityDestination: 'activityDestination',
  Accommodation: 'accommodation',
} as const;

export const routeLineLayerId = 'Route Line' as const;
export const routeArrowLayerId = 'Route Line Arrow' as const;
export const routeSourceId = 'route' as const;

export const RouteType = {
  Activity: 'activity',
  Flight: 'flight',
  Train: 'train',
} as const;
export type RouteTypeType = (typeof RouteType)[keyof typeof RouteType];

export type Line = {
  id: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  type: RouteTypeType;
};

export type MarkerLocation =
  | {
      type: typeof LocationType.Activity;
      id: string;
      lat: number;
      lng: number;
      isToday: boolean;
      customIcon: string | null;
    }
  | {
      type: typeof LocationType.ActivityDestination;
      id: string;
      lat: number;
      lng: number;
      isToday: boolean;
      customIcon: string | null;
    }
  | {
      type: typeof LocationType.Accommodation;
      id: string;
      lat: number;
      lng: number;
      isToday: boolean;
      customIcon: string | null;
    };

export type PopupPortal =
  | {
      type:
        | typeof LocationType.Activity
        | typeof LocationType.ActivityDestination;
      activityId: string;
      popup: HTMLDivElement;
    }
  | {
      type: typeof LocationType.Accommodation;
      accommodationId: string;
      popup: HTMLDivElement;
    };
