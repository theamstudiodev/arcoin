import type {Tables} from '@/lib/database.types';

/** What the portfolio board reads for each project, and the row type it gives. */
export const PROJECT_COLUMNS = 'id, code, name, client, project_type, tier, priority, lead_id, target_date';
export type ProjectRow = Pick<
  Tables<'projects'>,
  'id' | 'code' | 'name' | 'client' | 'project_type' | 'tier' | 'priority' | 'lead_id' | 'target_date'
>;
