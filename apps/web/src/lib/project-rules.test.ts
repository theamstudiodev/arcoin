import {describe, expect, it} from 'vitest';
import {
  byPriority,
  overBy,
  projectSaveErrorMessage,
  TIER_LABELS,
  TIER_ORDER,
  tierCountLabel,
  tierLimit,
} from '@/lib/project-rules';

const LIMITS = {devLimit: 15, readyLimit: 10};

describe('TIER_ORDER', () => {
  it('runs from Development down to Dormant, and names every tier', () => {
    expect(TIER_ORDER).toEqual(['development', 'ready_to_release', 'response_awaited', 'dormant']);
    expect(Object.keys(TIER_LABELS).sort()).toEqual([...TIER_ORDER].sort());
  });
});

describe('tierLimit', () => {
  it('caps the two production tiers and leaves the waiting rooms uncapped', () => {
    expect(tierLimit('development', LIMITS)).toBe(15);
    expect(tierLimit('ready_to_release', LIMITS)).toBe(10);
    expect(tierLimit('response_awaited', LIMITS)).toBeNull();
    expect(tierLimit('dormant', LIMITS)).toBeNull();
  });
});

describe('overBy', () => {
  it('is 0 at the limit and counts the excess past it', () => {
    expect(overBy('development', 15, LIMITS)).toBe(0);
    expect(overBy('development', 18, LIMITS)).toBe(3);
    expect(overBy('ready_to_release', 11, LIMITS)).toBe(1);
  });

  it('never flags a tier with no limit, however full', () => {
    expect(overBy('response_awaited', 200, LIMITS)).toBe(0);
    expect(overBy('dormant', 200, LIMITS)).toBe(0);
  });
});

describe('byPriority', () => {
  it('puts 1 first and unranked projects last', () => {
    const projects = [
      {priority: null, name: 'Unranked'},
      {priority: 3, name: 'Third'},
      {priority: 1, name: 'First'},
      {priority: 2, name: 'Second'},
    ];
    expect([...projects].sort(byPriority).map((p) => p.name)).toEqual(['First', 'Second', 'Third', 'Unranked']);
  });

  it('falls back to the name so the order never wobbles between loads', () => {
    const projects = [
      {priority: null, name: 'Mangala'},
      {priority: null, name: 'Kadri'},
      {priority: 2, name: 'Zuari'},
      {priority: 2, name: 'Alva'},
    ];
    expect([...projects].sort(byPriority).map((p) => p.name)).toEqual(['Alva', 'Zuari', 'Kadri', 'Mangala']);
  });
});

describe('tierCountLabel', () => {
  it('says how full a capped tier is', () => {
    expect(tierCountLabel(4, 15)).toBe('4 of 15 projects');
    expect(tierCountLabel(1, 10)).toBe('1 of 10 project');
  });

  it('says there is no limit for a waiting room', () => {
    expect(tierCountLabel(1, null)).toBe('1 project, no limit');
    expect(tierCountLabel(0, null)).toBe('0 projects, no limit');
  });
});

describe('projectSaveErrorMessage', () => {
  it('names the duplicate code', () => {
    expect(projectSaveErrorMessage({code: '23505', message: 'duplicate'}, 'AMS-26-014')).toContain('AMS-26-014');
  });

  it('says who may make the change when the database refuses it', () => {
    expect(projectSaveErrorMessage({code: '42501', message: 'denied'}, null)).toMatch(/Asif or Athiq/);
  });

  it('falls back to something actionable for anything else', () => {
    expect(projectSaveErrorMessage({message: 'network down'}, null)).toMatch(/try again/i);
  });
});
