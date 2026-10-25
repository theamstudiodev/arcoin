import {describe, expect, it} from 'vitest';
import {idSchema} from '@/lib/schemas/id';

const id = idSchema('That project could not be found.');

describe('idSchema', () => {
  it('accepts an id Postgres generated', () => {
    expect(id.safeParse('3f2504e0-4f89-41d3-9a0c-0305e82c3301').success).toBe(true);
  });

  it("accepts the studio's own seeded ids, whatever variant bits they carry", () => {
    // These are the real seed values. `z.uuid()` rejects both: RFC 4122 reserves the c and d variants.
    expect(id.safeParse('00000000-0000-4000-c000-000000000005').success).toBe(true); // a project
    expect(id.safeParse('00000000-0000-4000-d000-000000000001').success).toBe(true); // a package
    expect(id.safeParse('00000000-0000-4000-b000-000000000003').success).toBe(true); // a person
    expect(id.safeParse('00000000-0000-4000-a000-000000000001').success).toBe(true); // the org
  });

  it('is not case sensitive, since Postgres prints lower case but accepts either', () => {
    expect(id.safeParse('3F2504E0-4F89-41D3-9A0C-0305E82C3301').success).toBe(true);
  });

  it('refuses anything that is not an id', () => {
    for (const bad of ['', 'athiq', '3f2504e0-4f89-41d3-9a0c', '3f2504e04f8941d39a0c0305e82c3301', 'zzzzzzzz-4f89-41d3-9a0c-0305e82c3301']) {
      expect(id.safeParse(bad).success, bad).toBe(false);
    }
  });

  it('says what the caller told it to say, so each screen names its own thing', () => {
    expect(id.safeParse('nope').error?.issues[0]?.message).toBe('That project could not be found.');
  });
});
