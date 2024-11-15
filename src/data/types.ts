export type DbActivityWithTrip = Omit<DbActivity, 'trip'> & {
  trip: DbTripWithActivity;
};

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

export type DbTripWithActivity = Omit<DbTrip, 'activity'> & {
  activity: DbActivityWithTrip[];
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

  viewer: DbUser[] | undefined;
  editor: DbUser[] | undefined;
  owner: DbUser[] | undefined;
};
export type DbUser = {
  id: string;
  handle: string;
  email: string;
  createdAt: number;
  lastUpdatedAt: number;
  activated: boolean;

  tripEditor: DbTrip[] | undefined;
  tripOwner: DbTrip[] | undefined;
  tripViewer: DbTrip[] | undefined;
};
export type DbSchema = {
  activity: DbActivity;
  trip: DbTrip;
  user: DbUser;
};
