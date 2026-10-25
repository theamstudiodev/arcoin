import {PACKAGE_ORDER, REMAINING_SHARE, type TaskForecast} from '@studesk/engine';
import type {
  PackageForSchedule,
  ProjectForSchedule,
  SettingsForSchedule,
  StudioForecast,
  TaskForSchedule,
} from '@/lib/forecast';
import {formatShortDate} from '@/lib/format';

/**
 * What the portfolio board knows beyond the project row itself.
 *
 * A card used to say the lead and a target date, which is what someone typed in months ago. What Athiq
 * needs at a glance is what the engine worked out this morning: which package is moving, when it now
 * finishes, and whether anything on it has slipped. None of that is stored anywhere — it is derived,
 * here, from the forecast every other screen reads.
 *
 * Nothing in this file computes a date. It reads the ones the engine produced.
 */

export interface ProjectMeta {
  /** 'Lead Lilia · Next P04 · Finishes 24 Nov 2026' */
  metaLine: string;
  /** The package code with open work, earliest in the delivery order. Null once everything is issued. */
  nextPackage: string | null;
  /** When the last open drawing on this project is forecast to finish. */
  finish: string | null;
  /** Drawings the engine says will miss their due date. */
  lateTasks: number;
}

export interface BoardSummary {
  packagesInProduction: number;
  slotLimit: number;
  /** Over the studio-wide slot limit, which is a studio rule broken rather than a warning. */
  overSlots: boolean;
  developmentCount: number;
  devLimit: number;
  overDevelopment: boolean;
  clashes: number;
}

type BoardRows = Pick<StudioForecast, 'projects' | 'packages' | 'tasks' | 'forecasts' | 'clashes' | 'settings'>;

/** A drawing still carrying hours. The engine's own test for whether a package is in production. */
function stillOpen(task: Pick<TaskForSchedule, 'status'>): boolean {
  return REMAINING_SHARE[task.status] > 0;
}

/**
 * Packages with work left on them, on Development projects only.
 *
 * This restates a rule that lives privately inside `schedule()`. It is restated rather than exported
 * from the engine because `package-card.tsx` already set that precedent, and `board.test.ts` holds the
 * two in step: if the engine ever counts differently, the strip and the clash list would tell Athiq two
 * different numbers, and the test fails first.
 */
export function packagesInProduction(
  projects: readonly Pick<ProjectForSchedule, 'id' | 'tier'>[],
  packages: readonly Pick<PackageForSchedule, 'id' | 'project_id'>[],
  tasks: readonly Pick<TaskForSchedule, 'package_id' | 'status'>[],
): ReadonlySet<string> {
  const development = new Set(
    projects.filter((project) => project.tier === 'development').map((project) => project.id),
  );
  const onDevelopment = new Set(
    packages.filter((pkg) => development.has(pkg.project_id)).map((pkg) => pkg.id),
  );
  return new Set(
    tasks.filter((task) => onDevelopment.has(task.package_id) && stillOpen(task)).map((task) => task.package_id),
  );
}

/** The three figures in the strip under the board's heading. */
export function boardSummary(rows: BoardRows & {settings: SettingsForSchedule}): BoardSummary {
  const inProduction = packagesInProduction(rows.projects, rows.packages, rows.tasks).size;
  const developmentCount = rows.projects.filter((project) => project.tier === 'development').length;
  return {
    packagesInProduction: inProduction,
    slotLimit: rows.settings.slot_limit,
    overSlots: inProduction > rows.settings.slot_limit,
    developmentCount,
    devLimit: rows.settings.dev_limit,
    overDevelopment: developmentCount > rows.settings.dev_limit,
    clashes: rows.clashes.length,
  };
}

/** 'Finishes 24 Nov 2026' — the last date any open drawing on the project is forecast to end. */
function finishesOn(tasks: readonly TaskForSchedule[], forecasts: ReadonlyMap<string, TaskForecast>): string | null {
  let latest: string | null = null;
  for (const task of tasks) {
    if (!stillOpen(task)) continue;
    const end = forecasts.get(task.id)?.end;
    if (end && (latest === null || end > latest)) latest = end;
  }
  return latest;
}

/** '2 tasks running late' — the red line the spec puts on a card that is slipping. */
export function lateLine(count: number): string {
  return `${count} ${count === 1 ? 'task' : 'tasks'} running late`;
}

export function projectBoardMeta(input: {
  project: Pick<ProjectForSchedule, 'id'>;
  packages: readonly PackageForSchedule[];
  tasks: readonly TaskForSchedule[];
  forecasts: ReadonlyMap<string, TaskForecast>;
  leadName: string | null;
}): ProjectMeta {
  const own = input.packages.filter((pkg) => pkg.project_id === input.project.id);
  const ownIds = new Set(own.map((pkg) => pkg.id));
  const tasks = input.tasks.filter((task) => ownIds.has(task.package_id));

  // The next package is the earliest in the studio's delivery order that still has drawings on it —
  // not the first one someone created. P01 before P04 before ADD, exactly as the engine schedules.
  const openCodes = new Set(
    own.filter((pkg) => tasks.some((task) => task.package_id === pkg.id && stillOpen(task))).map((pkg) => pkg.code),
  );
  const nextPackage = PACKAGE_ORDER.find((code) => openCodes.has(code)) ?? null;

  const finish = finishesOn(tasks, input.forecasts);
  const lateTasks = tasks.filter((task) => stillOpen(task) && (input.forecasts.get(task.id)?.lateDays ?? 0) > 0).length;

  const parts = [
    input.leadName ? `Lead ${input.leadName.replace(/^Ar\.\s*/, '')}` : 'No Project Architect',
    nextPackage ? `Next ${nextPackage}` : null,
    finish ? `Finishes ${formatShortDate(finish)}` : null,
  ].filter((part): part is string => part !== null);

  return {metaLine: parts.join(' · '), nextPackage, finish, lateTasks};
}
