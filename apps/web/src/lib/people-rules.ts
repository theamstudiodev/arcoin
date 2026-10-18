import {isAdmin, type PersonRole} from '@/lib/roles';

/**
 * An admin can't demote or deactivate themself, so the studio always keeps an admin who can undo a mistake.
 * Checked only when the person making the change is an admin; for anyone else the database refuses the change.
 */
export function selfLockoutError(meId: string, input: {id: string; role: PersonRole; active: boolean}): string | null {
  if (input.id !== meId) return null;
  if (isAdmin(input.role) && input.active) return null;
  return "You can't remove your own admin access. Ask the other admin to make this change.";
}

/** Plain words for a refused add or edit. */
export function personSaveErrorMessage(error: {code?: string; message: string}, email: string): string {
  if (error.code === '23505') return `${email} is already on the team list.`;
  if (error.code === '42501') return 'Only Asif or Athiq can add or change people.';
  return "Couldn't save. Check your connection and try again.";
}
