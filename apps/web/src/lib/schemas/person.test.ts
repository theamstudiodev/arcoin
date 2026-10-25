import {describe, expect, it} from 'vitest';
import {personSchema, personUpdateSchema} from '@/lib/schemas/person';

const ok = {name: ' Ar. Test ', email: 'Test@AMStudio.test ', role: 'junior', capacity: 1, active: true} as const;

describe('personSchema', () => {
  it('trims the name and lower-cases the email', () => {
    const person = personSchema.parse(ok);
    expect(person.name).toBe('Ar. Test');
    expect(person.email).toBe('test@amstudio.test');
  });

  it('asks for a name when it is blank', () => {
    const result = personSchema.safeParse({...ok, name: '  '});
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Give the person a name.');
  });

  it.each([0, -0.25, 1.5, 0.333])('refuses time on production of %s', (capacity) => {
    const result = personSchema.safeParse({...ok, capacity});
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Time on production is a share of the day, from 0.01 to 1.');
  });

  it.each([0.25, 0.29, 0.5, 1])('accepts time on production of %s', (capacity) => {
    expect(personSchema.safeParse({...ok, capacity}).success).toBe(true);
  });

  it('refuses a role the studio does not have', () => {
    expect(personSchema.safeParse({...ok, role: 'intern'}).success).toBe(false);
  });
});

describe('personUpdateSchema', () => {
  it('needs the id of the person being changed', () => {
    expect(personUpdateSchema.safeParse(ok).success).toBe(false);
    expect(personUpdateSchema.safeParse({...ok, id: '00000000-0000-4000-b000-000000000005'}).success).toBe(true);
  });
});
