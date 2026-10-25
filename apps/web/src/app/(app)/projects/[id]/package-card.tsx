import {REMAINING_SHARE} from '@studesk/engine';
import {AddTaskRow} from '@/app/(app)/projects/[id]/add-task-row';
import {TaskRegisterRow} from '@/app/(app)/projects/[id]/task-row';
import {Badge} from '@/components/ui/badge';
import {PACKAGE_NAMES} from '@/lib/package-rules';
import type {PackageRow} from '@/lib/packages';
import {
  type AssigneeChoice,
  finishesOn,
  formatHours,
  formatRegisterDate,
  plannedHours,
  type RegisterRow,
} from '@/lib/tasks';

const TH = 'px-2 py-1.5 font-mono text-label font-medium text-muted-foreground uppercase';

/**
 * One package, as a desktop table. Hidden below `md`: the Phase 1 scope calls the register unusable at
 * 390px and does not plan a phone version, so the phone gets `PackageSummary` to read instead of a
 * table to fight. Everything editable lives in the rows, which are Client Components.
 */
export function PackageCard({
  pkg,
  rows,
  people,
  scheduled,
}: {
  pkg: PackageRow;
  rows: readonly RegisterRow[];
  people: readonly AssigneeChoice[];
  scheduled: boolean;
}) {
  const tasks = rows.map((row) => row.task);
  const issued = tasks.filter((task) => task.status === 'issued').length;
  const finish = finishesOn(rows);
  // The engine's own definition of a package in production: at least one task with hours left on it.
  // Taken from the share table rather than restated, so the pill and the studio's 5-slot limit agree.
  const inProduction = scheduled && tasks.some((task) => REMAINING_SHARE[task.status] > 0);

  return (
    <section className="hidden overflow-hidden rounded-lg border bg-card md:block">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-navy-800/5 px-3 py-2">
        <h3 className="flex items-baseline gap-2">
          <span className="font-mono text-meta font-medium text-lime-700">{pkg.code}</span>
          <span className="text-title font-semibold">{PACKAGE_NAMES[pkg.code]}</span>
        </h3>
        <p className="ml-auto flex flex-wrap items-center gap-x-1.5 font-mono text-meta text-muted-foreground tabular-nums">
          <span>
            {issued} / {tasks.length} issued
          </span>
          <span aria-hidden>·</span>
          <span>{formatHours(plannedHours(tasks))} h</span>
          {finish && (
            <>
              <span aria-hidden>·</span>
              <span>finishes {formatRegisterDate(finish)}</span>
            </>
          )}
        </p>
        {inProduction && (
          <Badge className="rounded-[10px] bg-lime-500 text-label text-navy-900">In production</Badge>
        )}
      </header>

      {/* `relative` so the sr-only labels in the last column resolve against this box. Tailwind's
          sr-only is `position: absolute`, and with no positioned ancestor each one landed at its
          static position in the initial containing block — 925px across, 157px past a 768px tablet,
          which let the whole page be dragged sideways into empty space. */}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[58rem] text-left text-body">
          <thead>
            <tr className="border-b">
              <th scope="col" className={`${TH} w-[8.75rem]`}>
                Status
              </th>
              <th scope="col" className={`${TH} w-[34%]`}>
                Drawing / task
              </th>
              <th scope="col" className={`${TH} w-[8.5rem]`}>
                Assigned
              </th>
              <th scope="col" className={`${TH} w-[4.5rem]`}>
                Hours
              </th>
              <th scope="col" className={`${TH} w-[9rem]`}>
                Due
              </th>
              <th scope="col" className={`${TH} w-[10.5rem]`}>
                Forecast
              </th>
              <th scope="col" className={`${TH} w-[3rem]`}>
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody className="stagger-rows divide-y">
            {rows.length === 0 ? (
              <tr className="h-11">
                <td colSpan={7} className="px-2 text-meta text-muted-foreground">
                  Nothing listed in {pkg.code} yet. Add the first drawing below.
                </td>
              </tr>
            ) : (
              rows.map((row) => <TaskRegisterRow key={row.task.id} row={row} people={people} />)
            )}
          </tbody>
          <tfoot>
            <AddTaskRow packageId={pkg.id} code={pkg.code} people={people} />
          </tfoot>
        </table>
      </div>
    </section>
  );
}
