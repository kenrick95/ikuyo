import type { DbAccommodation } from '../Accommodation/db';
import type { DbActivity } from '../Activity/db';
import type { DbExpense } from '../Expense/db';
import type { DbTrip, DbTripUser } from '../Trip/db';
import type { DbUser } from '../User/db';

export type { DbUser };

export type DbSchema = {
  activity: DbActivity;
  trip: DbTrip;
  user: DbUser;
  tripUser: DbTripUser;
  accommodation: DbAccommodation;
  expense: DbExpense;
};
