export type DbActivity = {
  id: string;
  title: string;
  timestampStart: number;
  timestampEnd: number;
  createdAt: number;
  lastUpdatedAt: number;
  trip: DbTrip;
}; 
export type DbTrip = {
  id: string;
  title: string;
  timestampStart: number;
  timestampEnd: number;
  activity: DbActivity[];
  user: DbUser[];
};
export type DbUser = {
  id: string;
  handle: string;
  createdAt: number;
  lastUpdatedAt: number;
  trip: DbTrip[];
}
export type DbSchema = {
  activity: DbActivity;
  trip: DbTrip;
  user: DbUser;
};
