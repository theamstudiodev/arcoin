import Link from 'next/link';
import {
  BAR_HEIGHT,
  barColour,
  barGeometry,
  barLabel,
  type BlockedTask,
  DAY_WIDTH,
  LABEL_WIDTH,
  laneTop,
  legendFor,
  markerLeft,
  parseView,
  rowHeight,
  rowsByPackage,
  rowsByPerson,
  type TimelineBar,
  type TimelineRow,
  type TimelineScale,
  TIMELINE_VIEW_LABELS,
  TIMELINE_VIEWS,
  TIMELINE_WEEKS,
  timelineBars,
  timelineScale,
  type TimelineView,
} from '@/lib/timeline';
import {loadStudioForecast} from '@/lib/forecast';

// The row label column is sticky, so it has to sit above the bars as they scroll under it.
const LABEL_CELL = 'sticky left-0 z-20 shrink-0 border-r bg-background';

export default async function TimelinePage({searchParams}: PageProps<'/timeline'>) {
  const view = parseView((await searchParams).view);
  const studio = await loadStudioForecast();

  const scale = timelineScale(studio.today);
  const {bars, blocked} = timelineBars({
    tasks: studio.tasks,
    packages: studio.packages,
    projects: studio.projects,
    forecasts: studio.forecasts,
  });
  const rows = view === 'person' ? rowsByPerson(bars, studio.people) : rowsByPackage(bars);
  const legend = legendFor(bars);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-[26px] font-semibold">Timeline</h1>
        <p className="font-mono text-[13px] text-muted-foreground tabular-nums">{scale.label}</p>
        <div className="ml-auto flex rounded-md border p-0.5">
          {TIMELINE_VIEWS.map((option) => (
            <ViewTab key={option} option={option} current={view} />
          ))}
        </div>
      </div>

      {/* The scope calls the timeline unusable at 390px and does not plan a phone version. Saying so is
          kinder than rendering a grid nobody can read. */}
      <div className="bg-blueprint rounded-lg border px-6 py-16 text-center md:hidden">
        <p className="text-[15px] font-semibold text-white">Twelve weeks of work</p>
        <p className="mt-1 text-[13px] text-navy-100">
          The timeline needs a wide screen. Open it on a desktop — Today has what needs you now.
        </p>
      </div>

      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-lg border bg-card">
          <WeekHeader scale={scale} />
          {rows.map((row) => (
            <Row key={row.key} row={row} scale={scale} />
          ))}
        </div>

        <Legend entries={legend} />
      </div>

      {blocked.length > 0 && <Blocked tasks={blocked} />}
    </>
  );
}

function ViewTab({option, current}: {option: TimelineView; current: TimelineView}) {
  const active = option === current;
  return (
    <Link
      href={`/timeline?view=${option}`}
      aria-current={active ? 'page' : undefined}
      className={`flex h-9 items-center rounded px-3 text-[13px] transition-colors ${
        active ? 'bg-navy-800 font-medium text-white' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {TIMELINE_VIEW_LABELS[option]}
    </Link>
  );
}

function WeekHeader({scale}: {scale: TimelineScale}) {
  return (
    <div className="flex border-b">
      <div className={`${LABEL_CELL} h-8`} style={{width: LABEL_WIDTH}} />
      <div className="relative h-8" style={{width: scale.width}}>
        {scale.weeks.map((week) => (
          <span
            key={week.monday}
            className="absolute top-2 font-mono text-[10.5px] text-text-faint tabular-nums"
            style={{left: week.left + 4}}
          >
            {week.label}
          </span>
        ))}
        {scale.todayLeft !== null && (
          <span
            className="absolute top-2 font-mono text-[10.5px] font-medium text-lime-700"
            style={{left: scale.todayLeft + DAY_WIDTH + 2}}
          >
            Today
          </span>
        )}
      </div>
    </div>
  );
}

function Row({row, scale}: {row: TimelineRow; scale: TimelineScale}) {
  const height = rowHeight(row);

  return (
    <div className="flex border-b last:border-b-0">
      <div className={`${LABEL_CELL} flex flex-col justify-center px-3`} style={{width: LABEL_WIDTH, height}}>
        <span className="truncate text-[13.5px]">{row.label}</span>
        {row.meta && <span className="truncate text-[11.5px] text-text-faint">{row.meta}</span>}
      </div>

      <div className="relative" style={{width: scale.width, height}}>
        {/* Week gridlines, then today, then the work — so a bar is never hidden behind a line. */}
        {scale.weeks.map((week) => (
          <div key={week.monday} className="absolute top-0 bottom-0 w-px bg-border" style={{left: week.left}} />
        ))}
        {scale.todayLeft !== null && (
          <div
            aria-hidden
            className="absolute top-0 bottom-0 w-0.5 bg-lime-500"
            style={{left: scale.todayLeft}}
          />
        )}
        {row.lanes.map((lane, index) =>
          lane.map((bar) => <Bar key={bar.taskId} bar={bar} scale={scale} lane={index} />),
        )}
      </div>
    </div>
  );
}

function Bar({bar, scale, lane}: {bar: TimelineBar; scale: TimelineScale; lane: number}) {
  const geometry = barGeometry(scale, bar.start, bar.end);
  if (!geometry) return null;

  const due = markerLeft(scale, bar.dueDate);
  const late = bar.lateDays > 0;

  return (
    <>
      <div
        title={barLabel(bar)}
        aria-label={barLabel(bar)}
        className={`absolute flex items-center gap-1 overflow-hidden rounded px-1.5 opacity-90 ${barColour(bar)} ${
          late ? 'outline-2 outline-destructive' : ''
        } ${geometry.clippedStart ? 'rounded-l-none' : ''} ${geometry.clippedEnd ? 'rounded-r-none' : ''}`}
        style={{left: geometry.left, width: geometry.width, top: laneTop(lane), height: BAR_HEIGHT}}
      >
        {late && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-destructive" />}
        <span className="truncate text-[11px] text-white">
          {[bar.projectCode, bar.title].filter(Boolean).join(' ')}
        </span>
      </div>
      {due !== null && (
        <div
          aria-hidden
          className="absolute size-2 rotate-45 border border-navy-700"
          style={{left: due - 4, top: laneTop(lane) + BAR_HEIGHT / 2 - 4}}
        />
      )}
    </>
  );
}

function Legend({entries}: {entries: ReturnType<typeof legendFor>}) {
  if (entries.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {entries.map((entry) => (
        <span key={entry.code} className="flex items-center gap-1.5">
          <span aria-hidden className={`size-2.5 rounded-[2px] ${entry.colour}`} />
          <span className="font-mono text-[11.5px] text-muted-foreground">{entry.code}</span>
          <span className="text-[11.5px] text-text-faint">{entry.name}</span>
        </span>
      ))}
    </div>
  );
}

function Blocked({tasks}: {tasks: readonly BlockedTask[]}) {
  return (
    <section className="mt-4 rounded-lg border bg-card p-4">
      <h2 className="text-[15px] font-semibold">
        {tasks.length} {tasks.length === 1 ? 'task cannot be scheduled' : 'tasks cannot be scheduled'}
      </h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        These have no dates on the grid, which is exactly how work used to slip unnoticed.
      </p>
      <ul className="mt-2 divide-y">
        {tasks.map((task) => (
          <li key={task.taskId} className="flex flex-wrap items-baseline gap-x-2 py-1.5">
            <Link href={`/projects/${task.projectId}`} className="font-mono text-[12px] text-navy-700 hover:underline">
              {task.projectCode ?? 'No code'}
            </Link>
            <span className="text-[13.5px]">{task.title}</span>
            <span className="text-[12.5px] text-muted-foreground">{task.reason}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export const metadata = {title: `Timeline · ${TIMELINE_WEEKS} weeks`};
