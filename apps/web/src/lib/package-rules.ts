import {PACKAGE_ORDER} from '@studesk/engine';
import type {Enums} from '@/lib/database.types';

export type PackageCode = Enums<'package_code'>;

/**
 * The studio's package names, verbatim from CLAUDE.md. `ADD` is a first-class package, not an
 * afterthought: revised options, client meeting decks, site measurements and authority queries are
 * planned and timed exactly like a drawing.
 */
export const PACKAGE_NAMES: Record<PackageCode, string> = {
  P01: 'Site and Study',
  P02: 'Design (Concepts)',
  P03: 'Proposal and Presentation',
  P04: 'Design and Tender',
  P05: 'Co-ordinated Consultant and Vendor Drawings',
  CS: 'Civil / Structure',
  SV: 'Services',
  TD: 'Technical Details',
  ADD: 'Additional tasks',
};

/**
 * Production order, taken from the engine rather than restated here, so the register and the scheduler
 * can never disagree about which package comes first.
 */
export function byPackageOrder(a: {code: PackageCode}, b: {code: PackageCode}): number {
  return PACKAGE_ORDER.indexOf(a.code) - PACKAGE_ORDER.indexOf(b.code);
}

/** Plain words for a refused package save. */
export function packageSaveErrorMessage(error: {code?: string; message: string}, packageCode?: string): string {
  if (error.code === '23505') {
    return packageCode
      ? `This project already has a ${packageCode} package. Add the task to that one.`
      : 'This project already has that package. Add the task to the existing one.';
  }
  if (error.code === '42501') return 'Only the Project Architect or an admin can add a package.';
  return "Couldn't save. Check your connection and try again.";
}
