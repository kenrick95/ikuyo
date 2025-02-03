import { DbAccommodation } from '../Accommodation/db';
import { DbActivity } from '../Activity/db';
import { DbExpense } from '../Expense/db';
import { DbTrip, DbTripUser } from '../Trip/db';

export type DbUser = {
  id: string;
  handle: string;
  email: string;
  createdAt: number;
  lastUpdatedAt: number;
  activated: boolean;

  tripUser: DbTripUser[] | undefined;
};
export type DbSchema = {
  activity: DbActivity;
  trip: DbTrip;
  user: DbUser;
  tripUser: DbTripUser;
  accommodation: DbAccommodation;
  expense: DbExpense;
};
