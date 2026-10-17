import type {ScheduleInput, ScheduleResult} from './types';

/**
 * Places every open task of a Development project on its assignee's calendar, highest-priority
 * project first, and reports clashes. See CLAUDE.md → "The scheduler engine".
 *
 * Week 1: write the tests in test/schedule.test.ts first, then implement this.
 */
export function schedule(_input: ScheduleInput): ScheduleResult {
  throw new Error('schedule() is not implemented yet — write its tests first (packages/engine/test).');
}
