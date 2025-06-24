export const LocationType = {
  Activity: 'activity',
  ActivityDestination: 'activityDestination',
  Accommodation: 'accommodation',
} as const;

export const routeLineLayerId = 'Route Line' as const;
export const routeArrowLayerId = 'Route Line Arrow' as const;
export const routeSourceId = 'route' as const;

export type Line = {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
};

export type MarkerLocation =
  | {
      type: typeof LocationType.Activity;
      id: string;
      lat: number;
      lng: number;
    }
  | {
      type: typeof LocationType.ActivityDestination;
      id: string;
      lat: number;
      lng: number;
    }
  | {
      type: typeof LocationType.Accommodation;
      id: string;
      lat: number;
      lng: number;
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
