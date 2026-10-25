import {describe, expect, it} from 'vitest';
import {PACKAGE_NAMES} from '@/lib/package-rules';
import {packageSchema} from '@/lib/schemas/package';

const KADRI = '00000000-0000-4000-c000-000000000001';

describe('packageSchema', () => {
  it('takes a project and one of the nine codes', () => {
    const result = packageSchema.safeParse({project_id: KADRI, code: 'P04'});
    expect(result.success).toBe(true);
    expect(result.success && result.data.code).toBe('P04');
  });

  it('accepts every code the studio delivers, ADD included', () => {
    for (const code of Object.keys(PACKAGE_NAMES)) {
      expect(packageSchema.safeParse({project_id: KADRI, code}).success, code).toBe(true);
    }
  });

  it('refuses a code the studio does not use', () => {
    expect(packageSchema.safeParse({project_id: KADRI, code: 'P06'}).success).toBe(false);
    expect(packageSchema.safeParse({project_id: KADRI, code: ''}).error?.issues[0]?.message).toMatch(/package/i);
  });

  it('refuses a project it cannot identify', () => {
    expect(packageSchema.safeParse({project_id: 'AMS-26-014', code: 'P04'}).success).toBe(false);
  });
});
