export interface RSVPBase {
  id: string;
  event_id: string;
  user_id: string;
  reserved_at: string; // ISO datetime
  is_cancelled: boolean;
}