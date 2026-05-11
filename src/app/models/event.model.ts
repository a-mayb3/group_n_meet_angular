export interface EventBase {
  id: string;
  name: string;
  description: string;
  place: string;
  start_time: string; // ISO datetime
  end_time: string; // ISO datetime
  is_cancelled: boolean;
}