import Link from 'next/link';
import {Badge} from '@/components/ui/badge';
import {loadStudioForecast} from '@/lib/forecast';
import {getViewer} from '@/lib/me';
import {TASK_STATUS_LABELS, TASK_STATUS_TONE} from '@/lib/task-rules';
import {buildToday, studioHour, type TodayCard, type TodayCardKind, type TodayRow} from '@/lib/today';

// The left edge is the whole signal on this screen: red needs a decision, amber has slipped, navy is
// due, lime already went out. Red and amber mean nothing else anywhere in the system.
const EDGE: Record<TodayCardKind, string> = {
  decide: 'border-l-destructive',
  slipped: 'border-l-at-risk',
  due: 'border-l-navy-700',
  issued: 'border-l-lime-500',
};

export default async function TodayPage() {
  const {me} = await getViewer();
  if (!me) return null; // the layout already sent anyone without a team row to /login

  const studio = await loadStudioForecast();
  const brief = buildToday({
    today: studio.today,
    projects: studio.projects,
    packages: studio.packages,
    people: studio.people,
    clashes: studio.clashes,
    tasks: studio.tasks,
    forecasts: studio.forecasts,
    hour: studioHour(),
    viewer: {id: me.id, name: me.name, role: me.role},
  });

  return (
    <>
      {/* Full-bleed out of the layout's padding: on a phone this is the top of the installed app. */}
      <header className="bg-navy-800 pt-safe -mx-4 -mt-4 mb-4 px-4 py-5 md:-mx-6 md:-mt-6 md:px-6">
        <p className="text-[13px] text-lime-100">{brief.date}</p>
        <h1 className="font-heading text-[22px] font-semibold text-white">{brief.greeting}</h1>
        <p className="mt-0.5 text-[13px] text-navy-100">{brief.summary}</p>
      </header>

      {brief.cards.length === 0 ? (
        <div className="bg-blueprint rounded-lg border px-6 py-16 text-center">
          <p aria-hidden className="font-heading text-[28px] text-lime-500">
            ✓
          </p>
          <p className="mt-1 font-heading text-[18px] font-semibold text-white">Nothing needs you</p>
          <p className="mt-1 text-[13.5px] text-navy-100">
            Everything on schedule.{' '}
            {brief.laterThisWeek > 0
              ? `${brief.laterThisWeek} ${brief.laterThisWeek === 1 ? 'drawing' : 'drawings'} due later this week.`
              : 'Nothing else due this week.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:items-start">
          {brief.cards.map((card) => (
            <Card key={card.kind} card={card} />
          ))}
        </div>
      )}
    </>
  );
}

function Card({card}: {card: TodayCard}) {
  return (
    <section className={`rounded-lg border border-l-4 bg-card ${EDGE[card.kind]}`}>
      <Link href={card.href} className="flex items-start gap-2 p-3 hover:bg-muted/40">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            {card.label}
          </p>
          <p className="mt-0.5 text-[15px] leading-snug font-semibold">{card.headline}</p>
          {card.sub && <p className="mt-0.5 text-[12.5px] text-navy-700">{card.sub}</p>}
        </div>
        <span aria-hidden className="mt-1 shrink-0 text-muted-foreground">
          ›
        </span>
      </Link>

      {card.rows.length > 0 && (
        <ul className="divide-y border-t">
          {card.rows.map((row) => (
            <Row key={row.key} row={row} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Row({row}: {row: TodayRow}) {
  return (
    <li>
      {/* Every line taps through — that is the point of the screen, not a convenience. */}
      <Link href={row.href} className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-0.5 px-3 py-2 hover:bg-muted/40">
        {row.code && <span className="font-mono text-[11.5px] text-muted-foreground">{row.code}</span>}
        <span className="min-w-0 flex-1 truncate text-[13.5px]">{row.text}</span>
        {row.who && <span className="text-[12.5px] text-muted-foreground">{row.who}</span>}
        {row.status && (
          <Badge className={`rounded-[10px] text-[11px] ${TASK_STATUS_TONE[row.status]}`}>
            {TASK_STATUS_LABELS[row.status]}
          </Badge>
        )}
        {row.note && <span className="font-mono text-[11px] text-muted-foreground uppercase">{row.note}</span>}
      </Link>
    </li>
  );
}
