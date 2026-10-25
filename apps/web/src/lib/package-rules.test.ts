import {PACKAGE_ORDER} from '@studesk/engine';
import {describe, expect, it} from 'vitest';
import {byPackageOrder, PACKAGE_NAMES, packageSaveErrorMessage} from '@/lib/package-rules';

describe('PACKAGE_NAMES', () => {
  it('names all nine codes the engine knows about', () => {
    expect(Object.keys(PACKAGE_NAMES).sort()).toEqual([...PACKAGE_ORDER].sort());
  });

  it('uses the studio’s wording', () => {
    expect(PACKAGE_NAMES.P04).toBe('Design and Tender');
    expect(PACKAGE_NAMES.P05).toBe('Co-ordinated Consultant and Vendor Drawings');
    expect(PACKAGE_NAMES.ADD).toBe('Additional tasks');
  });
});

describe('byPackageOrder', () => {
  it('sorts by production order, not alphabetically', () => {
    const shuffled = [{code: 'ADD' as const}, {code: 'CS' as const}, {code: 'P01' as const}, {code: 'P04' as const}];
    expect([...shuffled].sort(byPackageOrder).map((p) => p.code)).toEqual(['P01', 'P04', 'CS', 'ADD']);
  });

  it('agrees with the engine, so the register and the scheduler read the same', () => {
    const reversed = [...PACKAGE_ORDER].reverse().map((code) => ({code}));
    expect([...reversed].sort(byPackageOrder).map((p) => p.code)).toEqual([...PACKAGE_ORDER]);
  });
});

describe('packageSaveErrorMessage', () => {
  it('says where to put the task when the package already exists', () => {
    const message = packageSaveErrorMessage({code: '23505', message: 'duplicate'}, 'P04');
    expect(message).toContain('P04');
    expect(message).toMatch(/already has/);
  });

  it('names who may add one when the database refuses', () => {
    expect(packageSaveErrorMessage({code: '42501', message: 'denied'})).toMatch(/Project Architect or an admin/);
  });

  it('falls back to something actionable', () => {
    expect(packageSaveErrorMessage({message: 'offline'})).toMatch(/try again/i);
  });
});
