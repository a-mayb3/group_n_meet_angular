import { UserBase } from './user.model';

export interface OrganizerGroupBase {
  id: string;
  name: string;
  description?: string;
  created?: string; // ISO datetime
  organizer_id?: string; // id of the user who created/owns the group

  // API may return members as full user objects or as ids
  members?: UserBase[];
  member_ids?: string[];

  // Legacy/alternate fields sometimes used by backend
  group_members?: any[];
}
