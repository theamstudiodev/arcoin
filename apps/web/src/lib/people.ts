import type {Tables} from '@/lib/database.types';

/** What the People screen reads for each person, and the row type it gives. */
export const PERSON_COLUMNS = 'id, name, email, role, capacity, active, auth_user_id';
export type PersonRow = Pick<
  Tables<'people'>,
  'id' | 'name' | 'email' | 'role' | 'capacity' | 'active' | 'auth_user_id'
>;
