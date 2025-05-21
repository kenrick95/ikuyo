export const TripGroup = {
  Upcoming: 'upcoming',
  Ongoing: 'ongoing',
  Past: 'past',
} as const;
export type TripGroupType = (typeof TripGroup)[keyof typeof TripGroup];
