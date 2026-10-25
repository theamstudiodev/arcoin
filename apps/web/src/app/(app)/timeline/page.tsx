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

/**
 * The programme draws itself left to right, a bar starting a little after the one to its left, so what is
 * happening this week lands before what is happening in February. The delay is the bar's own distance from
 * the left edge — milliseconds per pixel — and it stops climbing at the cap: twelve weeks is 1344px, and an
 * honest rate across all of it would still be arriving after Athiq had looked away.
 */
const DRAW_MS_PER_PX = 0.22;
const DRAW_DELAY_CAP = 300;

function drawDelay(left: number): string {
  return `${Math.min(Math.round(left * DRAW_MS_PER_PX), DRAW_DELAY_CAP)}ms`;
}

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
    // The one screen with no measure of its own: the grid is 1524px — a 180px label column and twelve
    // 112px weeks — and capping the page narrower than that only adds sideways scrolling to a window
    // that could have shown the week.
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-page font-semibold">Timeline</h1>
        <p className="font-mono text-meta text-muted-foreground tabular-nums">{scale.label}</p>
        <div className="ml-auto flex rounded-md border p-0.5">
          {TIMELINE_VIEWS.map((option) => (
            <ViewTab key={option} option={option} current={view} />
          ))}
        </div>
      </div>

      {/* The scope calls the timeline unusable at 390px and does not plan a phone version. Saying so is
          kinder than rendering a grid nobody can read. */}
      <div className="bg-blueprint rounded-lg border px-6 py-16 text-center md:hidden">
        <p className="text-title font-semibold text-white">Twelve weeks of work</p>
        <p className="mt-1 text-body text-navy-100">
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
    </div>
  );
}

function ViewTab({option, current}: {option: TimelineView; current: TimelineView}) {
  const active = option === current;
  return (
    <Link
      href={`/timeline?view=${option}`}
      aria-current={active ? 'page' : undefined}
      className={`flex h-11 items-center rounded px-3 text-meta transition-colors duration-quick md:h-10 ${
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
            className="absolute top-1.5 font-mono text-meta text-text-faint tabular-nums"
            style={{left: week.left + 4}}
          >
            {week.label}
          </span>
        ))}
        {scale.todayLeft !== null && (
          // On a Friday or a Saturday this sits over the next Monday's date, so it carries the card's own
          // background: one word on top, rather than two readings of the week printed through each other.
          <span
            className="absolute top-1.5 rounded bg-card px-1 font-mono text-meta font-medium text-lime-700"
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
        <span className="truncate text-body">{row.label}</span>
        {/* The label step, where the rest of the app floors at 13px: a row carrying one lane is 34px tall —
            a 22px bar and its padding — and Lilia's role has to sit under her name inside that, not push the
            grid out of step with the bars it labels. */}
        {row.meta && <span className="truncate text-label text-text-faint uppercase">{row.meta}</span>}
      </div>

      <div className="relative" style={{width: scale.width, height}}>
        {/* Week gridlines, then today, then the work — so a bar is never hidden behind a line. */}
        {scale.weeks.map((week) => (
          <div key={week.monday} className="absolute top-0 bottom-0 w-px bg-border" style={{left: week.left}} />
        ))}
        {scale.todayLeft !== null && (
          <div
            aria-hidden
            className="animate-grow-y absolute top-0 bottom-0 w-0.5 origin-top bg-lime-500"
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
  // The diamond waits for its own bar. A due date floating on an empty row reads as a date with no work.
  const delay = drawDelay(geometry.left);

  return (
    <>
      <div
        title={barLabel(bar)}
        aria-label={barLabel(bar)}
        className={`animate-grow-x absolute flex origin-left items-center gap-1 overflow-hidden rounded px-1.5 opacity-90 ${barColour(bar)} ${
          late ? 'outline-2 outline-destructive' : ''
        } ${geometry.clippedStart ? 'rounded-l-none' : ''} ${geometry.clippedEnd ? 'rounded-r-none' : ''}`}
        style={{
          left: geometry.left,
          width: geometry.width,
          top: laneTop(lane),
          height: BAR_HEIGHT,
          animationDelay: delay,
        }}
      >
        {late && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-destructive" />}
        {/* 11px inside a 22px bar (BAR_HEIGHT, drawn to the mock), which is the one place in the app that
            goes under 13px. A 13px caption needs 19px of line and would leave the drawing's name half cut. */}
        {/* The drawing's name only. The project is already said twice — by the bar's colour and by the
            legend under the grid — and prefixing "AMS-26-014" to every caption spent ten characters of a
            bar that is sixteen pixels per day saying it a third time. The full sentence, project code
            included, is on the bar's title and accessible name. */}
        <span className="truncate text-label text-white">{bar.title}</span>
      </div>
      {due !== null && (
        <div
          aria-hidden
          className="animate-fade-in absolute size-2 rotate-45 border border-navy-700"
          style={{left: due - 4, top: laneTop(lane) + BAR_HEIGHT / 2 - 4, animationDelay: delay}}
        />
      )}
    </>
  );
}

function Legend({entries}: {entries: ReturnType<typeof legendFor>}) {
  if (entries.length === 0) return null;
  return (
    <div className="stagger mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {entries.map((entry) => (
        <span key={entry.code} className="flex items-center gap-1.5">
          <span aria-hidden className={`size-2.5 rounded-[2px] ${entry.colour}`} />
          <span className="font-mono text-meta text-muted-foreground">{entry.code}</span>
          <span className="text-meta text-text-faint">{entry.name}</span>
        </span>
      ))}
    </div>
  );
}

/**
 * The drawings the scheduler could not place. Phone and desktop both get this list — it is the only part
 * of the screen that works at 390px, and a drawing with nobody on it is exactly what Athiq wants to see
 * before the grid.
 */
function Blocked({tasks}: {tasks: readonly BlockedTask[]}) {
  return (
    <section className="mt-4 rounded-lg border bg-card p-4">
      <h2 className="text-section font-semibold">
        {tasks.length} {tasks.length === 1 ? 'task cannot be scheduled' : 'tasks cannot be scheduled'}
      </h2>
      <p className="mt-1 text-body text-muted-foreground">
        These have no dates on the grid, which is exactly how work used to slip unnoticed.
      </p>
      <ul className="stagger mt-2 divide-y">
        {tasks.map((task) => (
          <li
            key={task.taskId}
            className="flex flex-col gap-0.5 py-2 md:flex-row md:flex-wrap md:items-baseline md:gap-x-3"
          >
            <span className="flex min-w-0 items-baseline gap-2">
              {/* The code is the whole link, and on a phone it is five mono characters — the pseudo-element
                  gives the thumb the 44px the text does not have. */}
              <Link
                href={`/projects/${task.projectId}`}
                className="relative font-mono text-meta text-navy-700 after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] hover:underline"
              >
                {task.projectCode ?? 'No code'}
              </Link>
              <span className="truncate text-title">{task.title}</span>
            </span>
            <span className="text-meta text-muted-foreground">{task.reason}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export const metadata = {title: `Timeline · ${TIMELINE_WEEKS} weeks`};
