import type { DbAccommodation } from '../Accommodation/db';
import type { DbActivity } from '../Activity/db';
import type { DbExpense } from '../Expense/db';
import type { DbTrip, DbTripUser } from '../Trip/db';

export type DbUser = {
  id: string;
  handle: string;
  email: string;
  createdAt: number;
  lastUpdatedAt: number;
  activated: boolean;
};
export type DbSchema = {
  activity: DbActivity;
  trip: DbTrip;
  user: DbUser;
  tripUser: DbTripUser;
  accommodation: DbAccommodation;
  expense: DbExpense;
};
