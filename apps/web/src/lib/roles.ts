import type {Enums} from '@/lib/database.types';

export type PersonRole = Enums<'person_role'>;

/** Admins run the studio: Ar. Asif (principal) and Ar. Athiq (director). Everyone else is staff. */
export const ADMIN_ROLES = ['principal', 'director'] as const satisfies readonly PersonRole[];

/** Decides what the screen shows. The database enforces who may change what, whatever this says. */
export function isAdmin(role: PersonRole): boolean {
  return (ADMIN_ROLES as readonly PersonRole[]).includes(role);
}

export const ROLE_LABELS: Record<PersonRole, string> = {
  principal: 'Principal Architect',
  director: 'Studio Director',
  lead: 'Project Architect',
  junior: 'Junior Architect',
  technical: 'Technical',
};
