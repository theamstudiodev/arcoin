import type {Clash, ClashKind} from '@studesk/engine';
import {describe, expect, it} from 'vitest';
import {blockingCount, bySeverity, CLASH_EDGE, CLASH_LABELS} from '@/lib/clash-rules';

const KINDS: ClashKind[] = ['slot_limit', 'lead_slot_limit', 'dev_limit', 'ready_limit', 'late', 'unschedulable'];
const clash = (kind: ClashKind, severity: Clash['severity']): Clash => ({kind, severity, message: kind});

describe('CLASH_LABELS', () => {
  it('names every kind the engine can emit', () => {
    expect(Object.keys(CLASH_LABELS).sort()).toEqual([...KINDS].sort());
  });

  it('groups the two capacity limits under one label, as the mock does', () => {
    expect(CLASH_LABELS.slot_limit).toBe('CAPACITY');
    expect(CLASH_LABELS.lead_slot_limit).toBe('CAPACITY');
  });

  it('labels every kind in 11px uppercase form', () => {
    for (const label of Object.values(CLASH_LABELS)) {
      expect(label, label).toBe(label.toUpperCase());
    }
  });
});

describe('CLASH_EDGE', () => {
  it('reserves red and amber for broken rules and warnings', () => {
    expect(CLASH_EDGE.block).toContain('destructive');
    expect(CLASH_EDGE.warn).toContain('at-risk');
    expect(CLASH_EDGE.info).toContain('navy');
  });
});

describe('bySeverity', () => {
  it('puts a broken studio limit above a warning, and a warning above a note', () => {
    const mixed = [clash('late', 'warn'), clash('unschedulable', 'info'), clash('slot_limit', 'block')];
    expect([...mixed].sort(bySeverity).map((c) => c.severity)).toEqual(['block', 'warn', 'info']);
  });

  it('is a total order, so the same studio state always lists the same way', () => {
    const same = [clash('lead_slot_limit', 'block'), clash('slot_limit', 'block'), clash('unschedulable', 'block')];
    const once = [...same].sort(bySeverity).map((c) => c.kind);
    const again = [...same].reverse().sort(bySeverity).map((c) => c.kind);
    expect(once).toEqual(again);
  });
});

describe('blockingCount', () => {
  it('counts only what needs a decision', () => {
    expect(blockingCount([clash('slot_limit', 'block'), clash('late', 'warn'), clash('dev_limit', 'block')])).toBe(2);
    expect(blockingCount([])).toBe(0);
  });
});
