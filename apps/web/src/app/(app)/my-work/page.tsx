import Link from 'next/link';
import {StatusControl} from '@/app/(app)/my-work/status-control';
import {capacityFrom, loadStudioForecast} from '@/lib/forecast';
import {formatShortDate} from '@/lib/format';
import {getViewer} from '@/lib/me';
import {buildMyWork, formatHours, type MyWorkGroup, type MyWorkTask} from '@/lib/my-work';

const GROUP_LABEL = 'font-mono text-label font-medium text-muted-foreground uppercase';

export default async function MyWorkPage() {
  const {me} = await getViewer();
  if (!me) return null; // the layout already sent anyone without a team row to /login

  const studio = await loadStudioForecast();
  const work = buildMyWork({
    personId: me.id,
    today: studio.today,
    projects: studio.projects,
    packages: studio.packages,
    tasks: studio.tasks,
    forecasts: studio.forecasts,
    // The studio's one definition of a person's hours on a day. Phase 3 hands in leave the same way.
    capacity: capacityFrom(studio.people, studio.settings, studio.holidays),
  });

  return (
    <div className="mx-auto w-full max-w-form">
      <header className="mb-4">
        <h1 className="font-heading text-page font-semibold">My work</h1>
        <p className="text-meta text-muted-foreground">This week</p>

        <div className="mt-2 max-w-md">
          <p className="font-mono text-meta text-muted-foreground tabular-nums">{work.week.label}</p>
          {/* A full bar is the most it can say. Being over is information, not an error — the answer is
              to move a drawing, which only Athiq or the project's lead can do. */}
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full ${work.week.overHours > 0 ? 'bg-at-risk' : 'bg-navy-700'}`}
              style={{width: `${work.week.filledPercent}%`}}
            />
          </div>
        </div>
      </header>

      {work.taskCount === 0 ? (
        <div className="bg-blueprint rounded-lg border px-6 py-16 text-center">
          <p className="text-title font-semibold text-white">Nothing assigned to you</p>
          <p className="mt-1 text-body text-navy-100">
            Athiq or the project&rsquo;s architect will put drawings on your list.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {work.groups.map((group) => (
            <Group key={group.key} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

function Group({group}: {group: MyWorkGroup}) {
  return (
    <section>
      <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
        <h2 className={GROUP_LABEL}>{group.label}</h2>
        {group.note && <span className="text-meta text-muted-foreground">{group.note}</span>}
      </div>
      <ul className="stagger grid gap-3 md:grid-cols-2">
        {group.tasks.map((task) => (
          <Card key={task.id} task={task} done={group.kind === 'done'} />
        ))}
      </ul>
    </section>
  );
}

function Card({task, done}: {task: MyWorkTask; done: boolean}) {
  return (
    <li className={`rounded-lg border bg-card p-3 ${done ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <Link
          href={`/projects/${task.projectId}`}
          className="font-mono text-meta text-navy-700 hover:underline"
        >
          {task.projectCode ?? task.projectName}
        </Link>
        <span className="font-mono text-meta text-text-faint">{task.packageCode}</span>
      </div>

      <p className="mt-0.5 text-title leading-snug font-medium">{task.title}</p>

      <p className="mt-0.5 text-meta text-muted-foreground">
        {formatHours(task.remainingHours)} h left
        {task.dueDate && (
          <>
            {' · '}
            <span className={task.lateDays > 0 ? 'font-medium text-destructive' : ''}>
              due {formatShortDate(task.dueDate)}
              {task.lateDays > 0 && ` · ${task.lateDays} ${task.lateDays === 1 ? 'day' : 'days'} late`}
            </span>
          </>
        )}
      </p>

      {task.blockedReason && <p className="mt-0.5 text-meta text-at-risk">{task.blockedReason}</p>}

      <StatusControl taskId={task.id} status={task.status} title={task.title} />
    </li>
  );
}
