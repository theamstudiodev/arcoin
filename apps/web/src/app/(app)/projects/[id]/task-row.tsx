'use client';

import {Trash2Icon} from 'lucide-react';
import {type KeyboardEvent, useState, useTransition} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {NativeSelect, NativeSelectOption} from '@/components/ui/native-select';
import {deleteTask, setTaskStatus, updateTask} from '@/lib/actions/tasks';
import {taskUpdateSchema} from '@/lib/schemas/task';
import {type TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_ORDER, TASK_STATUS_TONE} from '@/lib/task-rules';
import {
  type AssigneeChoice,
  blockedLabel,
  forecastRange,
  formatHours,
  lateLabel,
  type RegisterRow,
} from '@/lib/tasks';

// 16px on every field: an iPad runs iOS Safari too, and it zooms the page when a field smaller than
// that takes focus — then stays zoomed. The register is a desktop screen, not a phone one, but 768px
// is an iPad in portrait.
const CELL = 'px-2 align-middle';
const FIELD = 'h-9';
const SELECT = 'w-full [&>select]:h-9';

/**
 * One line of the drawing register, editable in place. This is the screen the studio lives in, so every
 * field commits where typing ends — on blur, or on Enter — rather than behind a Save button.
 *
 * Nothing here checks who may change what. Postgres does: a policy hides the row from someone with no
 * business in it, and a trigger lets the person a task is assigned to change its status and nothing
 * else, in a sentence written for the studio. Pre-checking it in React would mean guessing at the
 * project's lead, and showing Bushra a greyed-out field teaches her less than the refusal does.
 */
export function TaskRegisterRow({
  row: {task, forecast},
  people,
}: {
  row: RegisterRow;
  people: readonly AssigneeChoice[];
}) {
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [title, setTitle] = useState(task.title);
  const [assigneeId, setAssigneeId] = useState(task.assignee_id ?? '');
  const [hours, setHours] = useState(formatHours(task.hours));
  const [dueDate, setDueDate] = useState(task.due_date ?? '');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /** Back to what the database holds, so the register never shows a change that did not happen. */
  function revert() {
    setStatus(task.status);
    setTitle(task.title);
    setAssigneeId(task.assignee_id ?? '');
    setHours(formatHours(task.hours));
    setDueDate(task.due_date ?? '');
  }

  function saveDetails(next: {title: string; assigneeId: string; hours: string; dueDate: string}) {
    const input = {
      id: task.id,
      title: next.title,
      assignee_id: next.assigneeId,
      hours: next.hours,
      due_date: next.dueDate,
    };
    const parsed = taskUpdateSchema.safeParse(input);
    // Say it while they are still looking at the field. What they typed stays, so it can be corrected.
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the row and try again.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateTask(input);
      if (result.ok) return;
      revert();
      setError(result.error);
    });
  }

  function moveStatus(next: TaskStatus) {
    setStatus(next);
    setError(null);
    startTransition(async () => {
      const result = await setTaskStatus({id: task.id, status: next});
      if (result.ok) return;
      setStatus(task.status);
      setError(result.error);
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteTask({id: task.id});
      if (result.ok) return;
      setConfirming(false);
      setError(result.error);
    });
  }

  // Nothing is sent unless the field actually changed: tabbing through the register must not write to it.
  const commitTitle = () => {
    if (title !== task.title) saveDetails({title, assigneeId, hours, dueDate});
  };
  const commitHours = () => {
    if (hours !== formatHours(task.hours)) saveDetails({title, assigneeId, hours, dueDate});
  };
  const commitDueDate = () => {
    if (dueDate !== (task.due_date ?? '')) saveDetails({title, assigneeId, hours, dueDate});
  };

  const blurOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  const range = forecastRange(forecast);
  const late = forecast?.lateDays ?? 0;

  return (
    <>
      {/* An issued drawing is finished and out of the studio: still listed, no longer competing for attention. */}
      <tr className={`h-11 ${status === 'issued' ? 'opacity-60' : ''}`}>
        <td className={CELL}>
          <NativeSelect
            aria-label={`Status of ${task.title}`}
            value={status}
            disabled={pending}
            onChange={(event) => moveStatus(event.target.value as TaskStatus)}
            className={`${SELECT} rounded-[10px] transition-colors duration-brisk ${TASK_STATUS_TONE[status]} [&>select]:border-transparent`}
          >
            {TASK_STATUS_ORDER.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {TASK_STATUS_LABELS[value]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </td>
        <td className={CELL}>
          <Input
            aria-label={`Drawing or task, ${task.title}`}
            value={title}
            disabled={pending}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={blurOnEnter}
            className={`${FIELD} border-transparent hover:border-input`}
          />
        </td>
        <td className={CELL}>
          <NativeSelect
            aria-label={`Assigned to for ${task.title}`}
            value={assigneeId}
            disabled={pending}
            onChange={(event) => {
              setAssigneeId(event.target.value);
              saveDetails({title, assigneeId: event.target.value, hours, dueDate});
            }}
            className={SELECT}
          >
            <NativeSelectOption value="">Nobody yet</NativeSelectOption>
            {people.map((person) => (
              <NativeSelectOption key={person.id} value={person.id}>
                {person.active ? person.name : `${person.name} (inactive)`}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </td>
        <td className={CELL}>
          <Input
            aria-label={`Hours for ${task.title}`}
            type="number"
            inputMode="decimal"
            step={0.5}
            min={0}
            max={999}
            value={hours}
            disabled={pending}
            onChange={(event) => setHours(event.target.value)}
            onBlur={commitHours}
            onKeyDown={blurOnEnter}
            className={`${FIELD} w-[70px] px-2 text-right font-mono tabular-nums`}
          />
        </td>
        <td className={CELL}>
          <Input
            aria-label={`Due date for ${task.title}`}
            type="date"
            value={dueDate}
            disabled={pending}
            onChange={(event) => setDueDate(event.target.value)}
            onBlur={commitDueDate}
            onKeyDown={blurOnEnter}
            className={`${FIELD} px-2 font-mono tabular-nums`}
          />
        </td>
        <td className={`${CELL} font-mono text-meta whitespace-nowrap tabular-nums`}>
          {range ? (
            <>
              {range}
              {late > 0 && <span className="font-medium text-red-700"> · {lateLabel(late)}</span>}
            </>
          ) : forecast?.reason ? (
            <span className="text-muted-foreground">{blockedLabel(forecast.reason)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className={`${CELL} text-right`}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${task.title}`}
            disabled={pending}
            onClick={() => setConfirming(true)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2Icon />
          </Button>
        </td>
      </tr>

      {/*
       * Deleting a drawing takes its hours and its history with it, so it asks first — and it asks on a
       * row of its own rather than inside the last cell. Two buttons side by side forced that column to
       * 104px on every row in the register, which is 104px taken from the drawing's own name.
       */}
      {confirming && (
        <tr className="animate-in fade-in slide-in-from-top-1 duration-quick bg-late-tint">
          <td colSpan={7} className="px-2 py-1.5">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-body">Delete “{task.title}” and its hours?</span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={remove}
                aria-label={`Delete ${task.title}`}
              >
                Delete
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                Keep
              </Button>
            </span>
          </td>
        </tr>
      )}
      {error && (
        <tr className="bg-late-tint">
          <td colSpan={7} className="px-2 py-1.5">
            <p role="alert" className="text-body text-destructive">
              {error}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}
