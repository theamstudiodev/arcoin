import {describe, expect, it} from 'vitest';
import {personSaveErrorMessage, selfLockoutError} from '@/lib/people-rules';

describe('selfLockoutError', () => {
  it('stops an admin demoting themself', () => {
    expect(selfLockoutError('me', {id: 'me', role: 'lead', active: true})).toBe(
      "You can't remove your own admin access. Ask the other admin to make this change.",
    );
  });

  it('stops an admin making themself inactive', () => {
    expect(selfLockoutError('me', {id: 'me', role: 'director', active: false})).toMatch(/own admin access/);
  });

  it('lets an admin change their own details', () => {
    expect(selfLockoutError('me', {id: 'me', role: 'director', active: true})).toBeNull();
  });

  it('lets an admin change someone else, even to inactive', () => {
    expect(selfLockoutError('me', {id: 'other', role: 'junior', active: false})).toBeNull();
  });
});

describe('personSaveErrorMessage', () => {
  it('names a duplicate email', () => {
    expect(personSaveErrorMessage({code: '23505', message: 'duplicate key'}, 'a@b.co')).toBe(
      'a@b.co is already on the team list.',
    );
  });

  it('says who can change people when the database refuses', () => {
    expect(personSaveErrorMessage({code: '42501', message: 'row-level security'}, 'a@b.co')).toBe(
      'Only Asif or Athiq can add or change people.',
    );
  });

  it('asks to check the connection otherwise', () => {
    expect(personSaveErrorMessage({message: 'fetch failed'}, 'a@b.co')).toBe(
      "Couldn't save. Check your connection and try again.",
    );
  });
});
