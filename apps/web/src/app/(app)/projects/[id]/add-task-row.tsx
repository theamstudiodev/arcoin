'use client';

import {PlusIcon} from 'lucide-react';
import {type KeyboardEvent, useRef, useState, useTransition} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {NativeSelect, NativeSelectOption} from '@/components/ui/native-select';
import {addTask} from '@/lib/actions/tasks';
import type {PackageCode} from '@/lib/package-rules';
import {taskSchema} from '@/lib/schemas/task';
import type {AssigneeChoice} from '@/lib/tasks';

// 16px, like every other field in the register: an iPad is iOS Safari, and it zooms on anything smaller.
const CELL = 'px-2 py-1.5 align-middle';
const FIELD = 'h-8 text-base md:text-base';
const LABEL = 'font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase';

/**
 * The row that adds work to a package — a drawing, or in `ADD` a revised option, a client meeting deck,
 * a site visit. Phase 1 scope calls this a first-class requirement, not an edge case, so it sits at the
 * foot of every package rather than behind a dialog.
 *
 * It stays on one line and keeps the focus in the title afterwards: Lilia types a drawing list in one
 * sitting, and a form that has to be reopened for each row is a form she will not use.
 */
export function AddTaskRow({
  packageId,
  code,
  people,
}: {
  packageId: string;
  code: PackageCode;
  people: readonly AssigneeChoice[];
}) {
  const titleField = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [hours, setHours] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add() {
    const input = {package_id: packageId, title, assignee_id: assigneeId, hours, due_date: dueDate};
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the row and try again.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addTask(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle('');
      setAssigneeId('');
      setHours('');
      setDueDate('');
      titleField.current?.focus();
    });
  }

  const addOnEnter = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === 'Enter' && !pending) {
      event.preventDefault();
      add();
    }
  };

  return (
    <>
      <tr className="border-t bg-muted/40" onKeyDown={addOnEnter}>
        <td className={CELL}>
          <span className={LABEL}>Add a task</span>
        </td>
        <td className={CELL}>
          <Input
            ref={titleField}
            aria-label={`Drawing or task in ${code}`}
            placeholder="Drawing or task"
            value={title}
            disabled={pending}
            autoComplete="off"
            onChange={(event) => setTitle(event.target.value)}
            className={FIELD}
          />
        </td>
        <td className={CELL}>
          <NativeSelect
            aria-label={`Assigned to in ${code}`}
            value={assigneeId}
            disabled={pending}
            onChange={(event) => setAssigneeId(event.target.value)}
            className="w-full [&>select]:h-8 [&>select]:text-base"
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
            aria-label={`Hours in ${code}`}
            type="number"
            inputMode="decimal"
            step={0.5}
            min={0}
            max={999}
            placeholder="0"
            value={hours}
            disabled={pending}
            onChange={(event) => setHours(event.target.value)}
            className={`${FIELD} w-[70px] px-2 text-right font-mono tabular-nums`}
          />
        </td>
        <td className={CELL}>
          <Input
            aria-label={`Due date in ${code}`}
            type="date"
            value={dueDate}
            disabled={pending}
            onChange={(event) => setDueDate(event.target.value)}
            className={`${FIELD} px-2 font-mono tabular-nums`}
          />
        </td>
        <td className={CELL} colSpan={2}>
          <Button type="button" aria-label={`Add task to ${code}`} disabled={pending} onClick={add} className="h-8">
            <PlusIcon />
            {pending ? 'Adding…' : 'Add'}
          </Button>
        </td>
      </tr>
      {error && (
        <tr className="bg-late-tint">
          <td colSpan={7} className="px-2 py-1.5">
            <p role="alert" className="text-[13px] text-red-700">
              {error}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}
