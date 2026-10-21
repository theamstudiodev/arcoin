import type {Enums} from '@/lib/database.types';

export type ProjectTier = Enums<'project_tier'>;

/** Board order. Work moves up this list towards Development, which is the only tier that gets scheduled. */
export const TIER_ORDER = [
  'development',
  'ready_to_release',
  'response_awaited',
  'dormant',
] as const satisfies readonly ProjectTier[];

export const TIER_LABELS: Record<ProjectTier, string> = {
  development: 'Development',
  ready_to_release: 'Ready to Release',
  response_awaited: 'Response Awaited',
  dormant: 'Dormant',
};

export const TIER_HINTS: Record<ProjectTier, string> = {
  development: 'Dated schedule and a named Project Architect. Only these are scheduled.',
  ready_to_release: 'Every input in hand, next to enter Development.',
  response_awaited: 'Waiting on a client decision, a payment or a document.',
  dormant: 'No client response for 60 days or more.',
};

export interface TierLimits {
  devLimit: number;
  readyLimit: number;
}

/**
 * Development and Ready to Release are capped — those are the studio's production limits.
 * The other two are waiting rooms and hold as many projects as the client list produces.
 */
export function tierLimit(tier: ProjectTier, limits: TierLimits): number | null {
  if (tier === 'development') return limits.devLimit;
  if (tier === 'ready_to_release') return limits.readyLimit;
  return null;
}

/** How many projects a tier is over its limit by; 0 when it is within, or has no limit. */
export function overBy(tier: ProjectTier, count: number, limits: TierLimits): number {
  const limit = tierLimit(tier, limits);
  if (limit === null) return 0;
  return Math.max(0, count - limit);
}

/** 1 is most urgent. An unranked project sits behind every ranked one, and ties fall back to the name. */
export function byPriority(
  a: {priority: number | null; name: string},
  b: {priority: number | null; name: string},
): number {
  const byRank = (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER);
  if (byRank !== 0) return byRank;
  return a.name.localeCompare(b.name);
}

/** "4 of 15 projects" reads properly aloud, where the "4 / 15" on screen does not. */
export function tierCountLabel(count: number, limit: number | null): string {
  const noun = count === 1 ? 'project' : 'projects';
  return limit === null ? `${count} ${noun}, no limit` : `${count} of ${limit} ${noun}`;
}

/** Plain words for a refused add or edit. */
export function projectSaveErrorMessage(error: {code?: string; message: string}, code: string | null): string {
  if (error.code === '23505') {
    return code ? `Project code ${code} is already used by another project.` : 'That project code is already used.';
  }
  if (error.code === '42501') return 'Only Asif or Athiq can add or change projects.';
  return "Couldn't save. Check your connection and try again.";
}
