export const TripSharingLevel = {
  Private: 0,
  PublicUnlisted: 2,
  PublicListed: 3,
} as const;
export type TripSharingLevelType =
  (typeof TripSharingLevel)[keyof typeof TripSharingLevel];
