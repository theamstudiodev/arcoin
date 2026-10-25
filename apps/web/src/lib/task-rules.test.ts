import {describe, expect, it} from 'vitest';
import {
  isTaskDone,
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
  TASK_STATUS_TONE,
  taskSaveErrorMessage,
} from '@/lib/task-rules';

describe('the five statuses', () => {
  it('runs in the order work moves through, and every one is named and toned', () => {
    expect(TASK_STATUS_ORDER).toEqual(['todo', 'in_progress', 'for_check', 'checked', 'issued']);
    expect(Object.keys(TASK_STATUS_LABELS).sort()).toEqual([...TASK_STATUS_ORDER].sort());
    expect(Object.keys(TASK_STATUS_TONE).sort()).toEqual([...TASK_STATUS_ORDER].sort());
  });

  it('uses the studio’s words, not the database’s', () => {
    expect(TASK_STATUS_LABELS.todo).toBe('Not started');
    expect(TASK_STATUS_LABELS.in_progress).toBe('In progress');
    expect(TASK_STATUS_LABELS.issued).toBe('Issued');
  });

  it('never tones a pill with red or amber — those mean lateness', () => {
    for (const tone of Object.values(TASK_STATUS_TONE)) {
      expect(tone, tone).not.toMatch(/red|at-risk|destructive/);
    }
  });
});

describe('isTaskDone', () => {
  it('is done at checked, and stays done at issued', () => {
    expect(isTaskDone('checked')).toBe(true);
    expect(isTaskDone('issued')).toBe(true);
  });

  it('is not done while there is work left', () => {
    expect(isTaskDone('todo')).toBe(false);
    expect(isTaskDone('in_progress')).toBe(false);
    expect(isTaskDone('for_check')).toBe(false);
  });
});

describe('taskSaveErrorMessage', () => {
  it('passes the trigger’s own sentence through, since it was written for the studio', () => {
    const fromTrigger = "Only the Project Architect or an admin can change a task's details. You can update its status.";
    expect(taskSaveErrorMessage({code: '42501', message: fromTrigger})).toBe(fromTrigger);
  });

  it('still says something useful if the refusal arrives without a message', () => {
    expect(taskSaveErrorMessage({code: '42501', message: '   '})).toMatch(/Project Architect/);
  });

  it('explains the half-hour rule rather than quoting the constraint', () => {
    expect(taskSaveErrorMessage({code: '23514', message: 'tasks_hours_check'})).toMatch(/half-hour/);
  });

  it('falls back to something actionable', () => {
    expect(taskSaveErrorMessage({message: 'network down'})).toMatch(/try again/i);
  });
});
