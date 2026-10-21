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
 * The phone's read-only view of a package. The scope is explicit that the register is the wrong tool
 * for a 390px screen, so nothing here is editable: Athiq checks what is in a package and what it will
 * finish on from the car, and types into it at a desk. Hidden from `md` up, where the table takes over.
 */
export function PackageSummary({
  pkg,
  rows,
  people,
}: {
  pkg: PackageRow;
  rows: readonly RegisterRow[];
  people: readonly AssigneeChoice[];
}) {
  const nameOf = new Map(people.map((person) => [person.id, person.name]));
  const tasks = rows.map((row) => row.task);
  const issued = tasks.filter((task) => task.status === 'issued').length;
  const finish = finishesOn(rows);

  return (
    <section className="rounded-lg border bg-card md:hidden">
      <header className="flex flex-col gap-1 border-b bg-navy-800/5 px-3 py-2.5">
        <h3 className="flex items-baseline gap-2">
          <span className="font-mono text-[13px] font-medium text-lime-700">{pkg.code}</span>
          <span className="text-[15px] font-semibold">{PACKAGE_NAMES[pkg.code]}</span>
        </h3>
        <p className="font-mono text-[12px] text-muted-foreground tabular-nums">
          {issued} / {tasks.length} issued · {formatHours(plannedHours(tasks))} h
          {finish && ` · finishes ${formatRegisterDate(finish)}`}
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="px-3 py-3 text-[13px] text-muted-foreground">Nothing listed in {pkg.code} yet.</p>
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
                  <p className="min-w-0 flex-1 text-[15px] leading-tight font-semibold">{task.title}</p>
                  <Badge className={`shrink-0 rounded-[10px] text-[11px] ${TASK_STATUS_TONE[task.status]}`}>
                    {TASK_STATUS_LABELS[task.status]}
                  </Badge>
                </div>
                <p className="text-[13px] text-muted-foreground">
                  {task.assignee_id ? (nameOf.get(task.assignee_id) ?? 'No longer on the team') : 'Nobody yet'} ·{' '}
                  {formatHours(task.hours)} h
                  {task.due_date && ` · due ${formatRegisterDate(task.due_date)}`}
                </p>
                {range && (
                  <p className="font-mono text-[12.5px] tabular-nums">
                    {range}
                    {late > 0 && <span className="font-medium text-red-700"> · {lateLabel(late)}</span>}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
