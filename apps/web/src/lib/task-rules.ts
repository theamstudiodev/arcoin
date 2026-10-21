import type {Enums} from '@/lib/database.types';

export type TaskStatus = Enums<'task_status'>;

/** The five statuses in the order work moves through them. */
export const TASK_STATUS_ORDER = [
  'todo',
  'in_progress',
  'for_check',
  'checked',
  'issued',
] as const satisfies readonly TaskStatus[];

/** What the studio calls each status. The database keeps its own names; these are for people. */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Not started',
  in_progress: 'In progress',
  for_check: 'For check',
  checked: 'Checked',
  issued: 'Issued',
};

/**
 * A drawing counts as done once it has been checked — issuing it is the last step, not the finish line.
 * The engine agrees: `checked` still carries a tenth of its hours, `issued` none.
 */
export function isTaskDone(status: TaskStatus): boolean {
  return status === 'checked' || status === 'issued';
}

/**
 * Status pill tones. Lime is a fill with navy text on it, never text on white — lime-500 reaches only
 * 1.5:1 there. Nothing here uses red or amber: those are reserved for lateness.
 */
export const TASK_STATUS_TONE: Record<TaskStatus, string> = {
  todo: 'bg-muted text-muted-foreground',
  in_progress: 'bg-info-tint text-info',
  for_check: 'bg-navy-100 text-navy-800',
  checked: 'bg-lime-100 text-navy-900',
  issued: 'bg-lime-500 text-navy-900',
};

/** Plain words for a refused task save. */
export function taskSaveErrorMessage(error: {code?: string; message: string}): string {
  // The trigger writes a sentence meant for the studio — "Only the Project Architect or an admin can
  // change a task's details. You can update its status." Show it rather than inventing our own.
  if (error.code === '42501') {
    return error.message.trim() || 'Only the Project Architect or an admin can change this task.';
  }
  if (error.code === '23514') return 'Hours go in half-hour steps — 1, 1.5, 2 and so on.';
  return "Couldn't save. Check your connection and try again.";
}
