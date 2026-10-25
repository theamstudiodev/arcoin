import {describe, expect, it} from 'vitest';
import {PROJECT_BAR_CLASSES, projectColourClass} from '@/lib/project-colours';

// The seeded codes, which is what the timeline will actually draw.
const SEEDED = ['AMS-26-014', 'AMS-26-008', 'AMS-26-002', 'AMS-25-019', 'AMS-26-021', 'AMS-25-031'];

describe('PROJECT_BAR_CLASSES', () => {
  it('is eight whole class names, so Tailwind emits every one', () => {
    expect(PROJECT_BAR_CLASSES).toHaveLength(8);
    for (const name of PROJECT_BAR_CLASSES) {
      expect(name).toMatch(/^bg-project-[1-8]$/);
    }
    expect(new Set(PROJECT_BAR_CLASSES).size).toBe(8);
  });
});

describe('projectColourClass', () => {
  it('gives the same project the same colour every time', () => {
    for (const code of SEEDED) {
      expect(projectColourClass(code)).toBe(projectColourClass(code));
    }
  });

  it('always returns one of the eight', () => {
    for (const code of [...SEEDED, '', 'x', 'AMS-27-001', 'a very long project code indeed']) {
      expect(PROJECT_BAR_CLASSES).toContain(projectColourClass(code));
    }
  });

  it('spreads the studio’s projects over several colours rather than collapsing them', () => {
    const used = new Set(SEEDED.map(projectColourClass));
    expect(used.size).toBeGreaterThan(2);
  });

  it('separates codes that differ only in their last character', () => {
    // Real project codes run in sequence, so this is the case that matters.
    const run = ['AMS-26-001', 'AMS-26-002', 'AMS-26-003', 'AMS-26-004'];
    expect(new Set(run.map(projectColourClass)).size).toBeGreaterThan(1);
  });
});
