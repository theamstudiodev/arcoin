import type {Clash} from '@studesk/engine';
import {bySeverity, CLASH_EDGE, CLASH_LABELS} from '@/lib/clash-rules';
import type {PersonForSchedule, ProjectForSchedule, TaskForSchedule} from '@/lib/forecast';

/**
 * A clash carries ids, because the engine is pure and has never heard of a project called Kadri
 * Residence. This turns those ids back into the names Athiq uses, so the list reads like the studio
 * talks. Nothing here decides what counts as a clash or what to do about it — the engine writes the
 * message, and the four checks it runs are fixed by PHASE-1-SCOPE item 8.
 */

/** The studio rows a clash is read against: exactly what `loadStudioForecast` already loaded. */
export interface ClashRows {
  projects: readonly Pick<ProjectForSchedule, 'id' | 'code' | 'name'>[];
  people: readonly Pick<PersonForSchedule, 'id' | 'name'>[];
  tasks: readonly Pick<TaskForSchedule, 'id' | 'title'>[];
}

/**
 * How many drawings one card names before it stops listing them. The per-lead limit hands over every
 * open task across three packages — nine titles on one card — and Athiq reads it to learn which
 * Project Architect is carrying too much, not to read the drawing register. Three is enough to
 * recognise the work; the rest are counted.
 */
export const NAMED_TASKS = 3;

export interface ClashCard {
  clash: Clash;
  /** CAPACITY · PORTFOLIO · LATE · BLOCKED, from the vocabulary the phone's Today card shares. */
  label: string;
  /** The 4px left edge for this severity. */
  edge: string;
  /** The project the clash names, when the id it carries is one. Only then is there a project to open. */
  project: Pick<ProjectForSchedule, 'id' | 'code' | 'name'> | null;
  /**
   * The person it names instead. The engine puts the Project Architect's own id in `projectId` on a
   * per-lead clash, and its message says only "This Project Architect" — without the name on screen
   * there is no way to tell whether Lilia or Disha is the one to talk to.
   */
  person: Pick<PersonForSchedule, 'id' | 'name'> | null;
  /** Up to `NAMED_TASKS` drawing titles, in the order the engine listed them. */
  taskTitles: readonly string[];
  /** Tasks beyond those, so the card can say how many it left out. */
  moreTasks: number;
}

/** Every clash as a card, blocking first, with each id it carries resolved to something readable. */
export function clashCards(clashes: readonly Clash[], rows: ClashRows): readonly ClashCard[] {
  const projectById = new Map(rows.projects.map((project) => [project.id, project]));
  const personById = new Map(rows.people.map((person) => [person.id, person]));
  const titleById = new Map(rows.tasks.map((task) => [task.id, task.title]));

  return [...clashes].sort(bySeverity).map((clash) => {
    // A task deleted since the forecast ran, or hidden from this viewer, has no title to show. It
    // drops out rather than putting a uuid in front of the studio.
    const titles = (clash.taskIds ?? []).flatMap((id) => {
      const title = titleById.get(id);
      return title ? [title] : [];
    });

    return {
      clash,
      label: CLASH_LABELS[clash.kind],
      edge: CLASH_EDGE[clash.severity],
      project: clash.projectId ? (projectById.get(clash.projectId) ?? null) : null,
      person: clash.projectId ? (personById.get(clash.projectId) ?? null) : null,
      taskTitles: titles.slice(0, NAMED_TASKS),
      moreTasks: Math.max(titles.length - NAMED_TASKS, 0),
    };
  });
}

/**
 * The line under the message: what this clash is about. The engine's messages name no project and no
 * drawing — "Forecast to finish …, 6 days after its … due date" could be any task in the studio — so
 * this is the half that tells Athiq where to look.
 */
export function clashDetail(card: ClashCard): string {
  const parts: string[] = [];
  if (card.project) {
    parts.push(card.project.code ? `${card.project.code} ${card.project.name}` : card.project.name);
  } else if (card.person) {
    parts.push(card.person.name);
  }
  parts.push(...card.taskTitles);
  if (card.moreTasks > 0) parts.push(`and ${card.moreTasks} more`);
  return parts.join(' · ');
}

/** Where `Open project` goes. Phase 1 has no project screen, so the board opens with the project named. */
export function projectHref(projectId: string): string {
  return `/projects?project=${projectId}`;
}
