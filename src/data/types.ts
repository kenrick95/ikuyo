export type DbActivity = {
  id: string;
  title: string;
  timestampStart: number;
  timestampEnd: number;
}; 
export type DbSchema = {
  activities: DbActivity;
};
