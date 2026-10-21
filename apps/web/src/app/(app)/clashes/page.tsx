import {CheckIcon} from 'lucide-react';
import Link from 'next/link';
import {Badge} from '@/components/ui/badge';
import {buttonVariants} from '@/components/ui/button';
import {blockingCount} from '@/lib/clash-rules';
import {type ClashCard, clashCards, clashDetail, projectHref} from '@/lib/clash-view';
import {loadStudioForecast} from '@/lib/forecast';
import {formatShortDate} from '@/lib/format';
import {cn} from '@/lib/utils';

// 11px uppercase mono, the way every label in the app is set (STITCH-PROMPTS Part 1).
const LABEL = 'font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase';

/**
 * Where the plan breaks a studio rule or misses a date. Display only: the scheduler decides what
 * counts as a clash and writes the sentence the studio reads, so this screen adds no judgement of
 * its own — it orders the list, colours the edge and puts names to the ids.
 *
 * The mock's subtitle reads "Updated 2 minutes ago", which assumes a stored forecast refreshed on a
 * timer. Phase 1 has none: the engine runs while this page renders, so the line says that instead
 * rather than claiming an age it cannot know.
 */
export default async function ClashesPage() {
  const forecast = await loadStudioForecast();
  const cards = clashCards(forecast.clashes, forecast);
  // A broken studio limit is what Athiq has to decide about this morning; a warning can wait.
  const blocking = blockingCount(forecast.clashes);

  return (
    // One column, 900px at most. A clash is a sentence, and a longer line is harder to read, not fuller.
    <div className="mx-auto w-full max-w-[900px]">
      <header className="mb-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-[26px] font-semibold">Clashes</h1>
          {cards.length > 0 && (
            <p className="text-[13px] text-muted-foreground">
              {cards.length} {cards.length === 1 ? 'clash' : 'clashes'}
            </p>
          )}
          {blocking > 0 && (
            <Badge className="rounded-[10px] bg-red-100 text-[11px] text-red-800">
              {blocking === 1 ? '1 needs a decision' : `${blocking} need a decision`}
            </Badge>
          )}
        </div>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Worked out as this page loaded · today is {formatShortDate(forecast.today)} · recalculated whenever anything
          changes
        </p>
      </header>

      {cards.length === 0 ? (
        <NoClashes />
      ) : (
        <ul className="flex flex-col gap-2">
          {cards.map((card, index) => (
            <ClashItem key={`${card.clash.kind}-${index}`} card={card} />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Phone: the label, the message, then the button under it on the right, 44px tall. Desktop: the
 * button moves alongside. Either way the 4px edge carries the severity, and never only the colour —
 * the label above the message says the same thing in words.
 */
function ClashItem({card}: {card: ClashCard}) {
  const detail = clashDetail(card);

  return (
    <li
      className={`flex flex-col gap-2 rounded-lg border border-l-4 bg-card p-3 md:flex-row md:items-start md:gap-4 ${card.edge}`}
    >
      <div className="min-w-0 flex-1">
        <p className={LABEL}>{card.label}</p>
        <p className="mt-1 text-[14.5px] leading-snug">{card.clash.message}</p>
        {detail && <p className="mt-1 text-[13px] text-muted-foreground">{detail}</p>}
      </div>
      {card.project && (
        <Link
          href={projectHref(card.project.id)}
          className={cn(buttonVariants({variant: 'outline'}), 'h-11 shrink-0 self-end px-3 md:h-9 md:self-auto')}
        >
          {/* Six cards can each carry this button, so a screen reader hears which project it opens. */}
          Open project<span className="sr-only"> {card.project.name}</span>
        </Link>
      )}
    </li>
  );
}

/** The seeded studio's normal state, and the one the partners are working towards. */
function NoClashes() {
  return (
    // The blueprint belongs to the login screen, the splash and empty states. This is an empty state.
    <div className="bg-blueprint rounded-lg border px-6 py-16 text-center">
      <span aria-hidden className="mx-auto grid size-11 place-items-center rounded-full bg-lime-500">
        <CheckIcon className="size-6 text-navy-900" strokeWidth={3} />
      </span>
      <p className="mt-3 text-[15px] font-semibold text-white">No clashes</p>
      <p className="mt-1 text-[13px] text-navy-100">
        Every scheduled task finishes by its due date and the production limits hold.
      </p>
    </div>
  );
}
