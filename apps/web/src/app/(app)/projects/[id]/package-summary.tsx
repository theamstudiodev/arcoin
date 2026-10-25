import {ChevronDownIcon} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {PACKAGE_NAMES} from '@/lib/package-rules';
import type {PackageRow} from '@/lib/packages';
import {TASK_STATUS_LABELS, TASK_STATUS_TONE} from '@/lib/task-rules';
import {
  type AssigneeChoice,
  finishesOn,
  forecastRange,
  formatHours,
  formatRegisterDate,
  lateLabel,
  plannedHours,
  type RegisterRow,
} from '@/lib/tasks';

/**
 * The read-only view of a package: the phone's, and the one anybody who cannot edit this project gets
 * at any width. The scope is explicit that the register is the wrong tool for a 390px screen, so
 * nothing here is editable — Athiq checks what is in a package and what it will finish on from the
 * car, and types into it at a desk.
 *
 * It does not hide itself at `md`. The page decides: it wraps this in `md:hidden` only for the person
 * who gets the table instead. The component used to carry `md:hidden` of its own, which meant a junior
 * on a laptop opened a project and saw its header above nothing at all.
 *
 * A `<details>` rather than a button and state, because a phone opens one package to read it and the
 * browser already does this: it works before React loads, it is keyboard and screen-reader correct
 * without a single aria attribute, and Ctrl-F finds a drawing inside a closed package.
 */
export function PackageSummary({
  pkg,
  rows,
  people,
  defaultOpen = false,
}: {
  pkg: PackageRow;
  rows: readonly RegisterRow[];
  people: readonly AssigneeChoice[];
  /** The first package on the screen opens itself, so the phone never lands on a wall of closed rows. */
  defaultOpen?: boolean;
}) {
  const nameOf = new Map(people.map((person) => [person.id, person.name]));
  const tasks = rows.map((row) => row.task);
  const issued = tasks.filter((task) => task.status === 'issued').length;
  const finish = finishesOn(rows);

  return (
    <details open={defaultOpen} className="group rounded-lg border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 border-b bg-navy-800/5 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <h3 className="flex items-baseline gap-2">
            <span className="font-mono text-meta font-medium text-lime-700">{pkg.code}</span>
            <span className="truncate text-title font-semibold">{PACKAGE_NAMES[pkg.code]}</span>
          </h3>
          <p className="font-mono text-meta text-muted-foreground tabular-nums">
            {issued} / {tasks.length} issued · {formatHours(plannedHours(tasks))} h
            {finish && ` · finishes ${formatRegisterDate(finish)}`}
          </p>
        </div>
        <ChevronDownIcon
          aria-hidden
          className="size-5 shrink-0 text-muted-foreground transition-transform duration-brisk group-open:rotate-180"
        />
      </summary>

      {rows.length === 0 ? (
        <p className="px-3 py-3 text-meta text-muted-foreground">Nothing listed in {pkg.code} yet.</p>
      ) : (
        <ul className="divide-y">
          {rows.map(({task, forecast}) => {
            const range = forecastRange(forecast);
            const late = forecast?.lateDays ?? 0;
            return (
              <li
                key={task.id}
                className={`flex flex-col gap-1 px-3 py-2.5 ${task.status === 'issued' ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 text-title leading-tight font-semibold">{task.title}</p>
                  <Badge className={`shrink-0 rounded-[10px] text-label ${TASK_STATUS_TONE[task.status]}`}>
                    {TASK_STATUS_LABELS[task.status]}
                  </Badge>
                </div>
                <p className="text-meta text-muted-foreground">
                  {task.assignee_id ? (nameOf.get(task.assignee_id) ?? 'No longer on the team') : 'Nobody yet'} ·{' '}
                  {formatHours(task.hours)} h
                  {task.due_date && ` · due ${formatRegisterDate(task.due_date)}`}
                </p>
                {range && (
                  <p className="font-mono text-meta tabular-nums">
                    {range}
                    {late > 0 && <span className="font-medium text-red-700"> · {lateLabel(late)}</span>}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </details>
  );
}
