export type DbActivity = {
  id: string;
  title: string;
  location: string;
  description: string;
  /** ms */
  timestampStart: number;
  /** ms */
  timestampEnd: number;
  createdAt: number;
  lastUpdatedAt: number;
  trip: DbTrip | undefined;
};
export type DbTrip = {
  id: string;
  title: string;
  /** ms of day of the trip start */
  timestampStart: number;
  /** ms of day _after_ of trip end. This means the final full day of trip is one day before `timestampEnd` */
  timestampEnd: number;
  timeZone: string;

  activity: DbActivity[] | undefined;
  user: DbUser[] | undefined;
};
export type DbUser = {
  id: string;
  handle: string;
  createdAt: number;
  lastUpdatedAt: number;
  trip: undefined | DbTrip[];
};
export type DbSchema = {
  activity: DbActivity;
  trip: DbTrip;
  user: DbUser;
};
