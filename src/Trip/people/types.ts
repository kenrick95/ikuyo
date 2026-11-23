export type TripPerson = {
  id: string;
  name: string;
  userId: string | null;
  handle: string | null;
  hasAccount: boolean;
  accountType: 'guest' | 'registered' | null;
  isParticipant: boolean;
  accessRole: 0 | 1 | 2 | null;
  archived?: boolean;
};

export const EMPTY_TRIP_PEOPLE: TripPerson[] = [];
