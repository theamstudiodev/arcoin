import type {Clash, ClashKind} from '@studesk/engine';

/**
 * How a clash reads on screen. Shared, because the clash list and the phone's Today card both show
 * the same clashes and must not invent two vocabularies for them.
 *
 * The engine emits six kinds. STITCH-PROMPTS designs four labels and adds WORKLOAD and FOLLOW UP,
 * which PHASE-1-SCOPE excludes — it allows "only four checks" — so those two are not built. The two
 * tier limits have no label in the mock, so they get one here.
 */
export const CLASH_LABELS: Record<ClashKind, string> = {
  slot_limit: 'CAPACITY',
  lead_slot_limit: 'CAPACITY',
  dev_limit: 'PORTFOLIO',
  ready_limit: 'PORTFOLIO',
  late: 'LATE',
  unschedulable: 'BLOCKED',
};

/**
 * The 4px left edge, by severity. Red is a studio rule broken, amber a warning, navy something to
 * know. Red and amber are never decorative — that is the only thing they mean in this system.
 */
export const CLASH_EDGE: Record<Clash['severity'], string> = {
  block: 'border-l-destructive',
  warn: 'border-l-at-risk',
  info: 'border-l-navy-700',
};

/** Blocking first: a broken studio limit outranks a warning, which outranks something to note. */
const SEVERITY_ORDER: Record<Clash['severity'], number> = {block: 0, warn: 1, info: 2};

export function bySeverity(a: Clash, b: Clash): number {
  const bySev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
  if (bySev !== 0) return bySev;
  // Then by kind, so the same studio state always lists in the same order.
  return CLASH_LABELS[a.kind].localeCompare(CLASH_LABELS[b.kind]) || a.kind.localeCompare(b.kind);
}

/** How many of these need a decision today, which is the number the phone's Today header shows. */
export function blockingCount(clashes: readonly Clash[]): number {
  return clashes.filter((clash) => clash.severity === 'block').length;
}
