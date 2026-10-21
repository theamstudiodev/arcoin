import {z} from 'zod';
import {Constants} from '@/lib/database.types';
import {idSchema} from '@/lib/schemas/id';

/**
 * A package being added to a project. Only the code is chosen: the name comes from `PACKAGE_NAMES`,
 * and `org_id` is copied from the project by a trigger, so neither is sent.
 */
export const packageSchema = z.object({
  project_id: idSchema('That project could not be found. Reload the page.'),
  code: z.enum(Constants.public.Enums.package_code, {error: 'Choose a package from the list.'}),
});

export type PackageInput = z.input<typeof packageSchema>;
