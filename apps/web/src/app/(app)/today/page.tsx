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
    <div className="mx-auto w-full max-w-form">
      {/*
       * The navy band runs out to the gutter, so these negatives have to cancel the shell's own padding
       * exactly — px-4 on a phone, px-8 from md up. The notch is the top bar's business now: this header
       * carried its own pt-safe back when Today was the only screen that reached the top of the phone,
       * and keeping it meant Athiq's greeting paid for the inset twice.
       */}
      <header className="bg-navy-800 -mx-4 -mt-4 mb-5 px-4 py-5 md:mx-0 md:mt-0 md:mb-6 md:rounded-xl md:px-6 md:py-6">
        <p className="text-meta text-lime-100">{brief.date}</p>
        <h1 className="font-heading text-page font-semibold text-white">{brief.greeting}</h1>
        <p className="mt-0.5 text-meta text-navy-100">{brief.summary}</p>
      </header>

      {brief.cards.length === 0 ? (
        <div className="bg-blueprint animate-in fade-in zoom-in-95 duration-settle rounded-lg border px-6 py-16 text-center">
          <p aria-hidden className="font-heading text-stat text-lime-500">
            ✓
          </p>
          <p className="mt-1 font-heading text-section font-semibold text-white">Nothing needs you</p>
          <p className="mt-1 text-body text-navy-100">
            Everything on schedule.{' '}
            {brief.laterThisWeek > 0
              ? `${brief.laterThisWeek} ${brief.laterThisWeek === 1 ? 'drawing' : 'drawings'} due later this week.`
              : 'Nothing else due this week.'}
          </p>
        </div>
      ) : (
        // The cards arrive in the order they matter — decide, slipped, due, issued — rather than all at
        // once, so the first thing Athiq's eye lands on at half past eight is the one needing a decision.
        <div className="stagger flex flex-col gap-3 md:grid md:grid-cols-2 md:items-start md:gap-4">
          {brief.cards.map((card) => (
            <Card key={card.kind} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}

function Card({card}: {card: TodayCard}) {
  return (
    <section className={`rounded-lg border border-l-4 bg-card ${EDGE[card.kind]}`}>
      <Link href={card.href} className="flex items-start gap-2 p-3 transition-colors duration-quick hover:bg-muted/40">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-label font-medium text-muted-foreground uppercase">{card.label}</p>
          <p className="mt-0.5 text-title font-semibold">{card.headline}</p>
          {card.sub && <p className="mt-0.5 text-meta text-navy-700">{card.sub}</p>}
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
      <Link
        href={row.href}
        className="flex min-h-11 flex-col justify-center gap-0.5 px-3 py-2 transition-colors duration-quick hover:bg-muted/40 md:flex-row md:flex-wrap md:items-center md:gap-x-2"
      >
        {/*
         * The drawing's name gets its own line on a phone. Across 390px, a code, a name, a person, a
         * status pill and "4 DAYS LATE" on one row left the name about ten pixels wide — the one thing
         * on the line Athiq is actually reading. From `md` up they all fit, so they share a row again.
         */}
        <span className="text-body md:order-2 md:min-w-0 md:flex-1 md:truncate">{row.text}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 md:contents">
          {row.code && <span className="font-mono text-meta text-muted-foreground md:order-1">{row.code}</span>}
          {row.who && <span className="text-meta text-muted-foreground md:order-3">{row.who}</span>}
          {row.status && (
            <Badge className={`rounded-[10px] text-label md:order-4 ${TASK_STATUS_TONE[row.status]}`}>
              {TASK_STATUS_LABELS[row.status]}
            </Badge>
          )}
          {row.note && (
            <span className="font-mono text-label text-muted-foreground uppercase md:order-5">{row.note}</span>
          )}
        </span>
      </Link>
    </li>
  );
}
