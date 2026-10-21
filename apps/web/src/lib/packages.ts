import {PACKAGE_ORDER} from '@studesk/engine';
import type {Tables} from '@/lib/database.types';
import type {PackageCode} from '@/lib/package-rules';

/**
 * A package as the drawing register reads it. The nine codes are not created with the project: one
 * appears when the studio starts planning it, so a young project shows two cards and an old one nine.
 */
export type PackageRow = Pick<Tables<'packages'>, 'id' | 'project_id' | 'code'>;

/**
 * The codes a project does not have yet, in production order — what the "Add package" list offers.
 * `packages (project_id, code)` is unique, so offering a code twice would only earn a 23505.
 */
export function packageCodesNotOn(packages: readonly {code: PackageCode}[]): readonly PackageCode[] {
  const present = new Set(packages.map((pkg) => pkg.code));
  return PACKAGE_ORDER.filter((code) => !present.has(code));
}
