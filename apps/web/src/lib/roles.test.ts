import {expect, it} from 'vitest';
import {isAdmin} from '@/lib/roles';

it('treats the principal and the studio director as admins', () => {
  expect(isAdmin('principal')).toBe(true);
  expect(isAdmin('director')).toBe(true);
});

it('treats Project Architects, juniors and technical staff as staff', () => {
  expect(isAdmin('lead')).toBe(false);
  expect(isAdmin('junior')).toBe(false);
  expect(isAdmin('technical')).toBe(false);
});
