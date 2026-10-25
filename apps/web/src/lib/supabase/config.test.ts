import {describe, expect, it} from 'vitest';
import {withSessionLength} from '@/lib/supabase/config';

describe('withSessionLength', () => {
  it("keeps the session cookie for 90 days instead of the library's 400", () => {
    expect(withSessionLength({path: '/', sameSite: 'lax', maxAge: 400 * 24 * 60 * 60}))
      .toEqual({path: '/', sameSite: 'lax', maxAge: 7_776_000});
  });

  it('leaves a deleted cookie deleted, so signing out still works', () => {
    expect(withSessionLength({path: '/', maxAge: 0})).toEqual({path: '/', maxAge: 0});
  });
});
