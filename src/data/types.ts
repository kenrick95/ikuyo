export type DbActivity = {
  title: string;
  timestampStart: number;
  timestampEnd: number;
};
export type DbActivities = {
  [activityId: string]: DbActivity;
};
export type DbSchema = {
  activities: DbActivities;
};
