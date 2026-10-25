'use client';

import {ChevronRightIcon} from 'lucide-react';
import Link from 'next/link';
import {useState} from 'react';
import {Badge} from '@/components/ui/badge';
import type {ProjectMeta} from '@/lib/board';
import {lateLine} from '@/lib/board';
import {projectEdgeClass} from '@/lib/project-colours';
import {type ProjectTier, TIER_HINTS, TIER_LABELS, TIER_ORDER, tierCountLabel} from '@/lib/project-rules';
import type {ProjectRow} from '@/lib/projects';

export interface PhoneTier {
  tier: ProjectTier;
  limit: number | null;
  over: number;
  rows: readonly {project: ProjectRow; meta: ProjectMeta}[];
}

/**
 * The portfolio on a phone: one tier at a time, as a list.
 *
 * The desktop board is four columns side by side, which is right at 1440px and wrong at 390px — a
 * phone stacked them, so reaching Dormant meant scrolling past fifty cards. The scope describes this
 * screen separately for that reason, and this is it: a sticky row of tier chips that *filter*, then
 * hairline rows rather than cards.
 *
 * The rows do not carry the tier and priority controls the desktop cards do. That is the scope's
 * call — Tier and Priority are "the only two things editable on mobile" and they live on the
 * project's own screen, where there is room to show what the change did.
 */
export function PhoneBoard({tiers}: {tiers: readonly PhoneTier[]}) {
  // Development first: it is the only tier that is scheduled, and the one Athiq opens the app for.
  const [shown, setShown] = useState<ProjectTier>(TIER_ORDER[0] as ProjectTier);
  const current = tiers.find((entry) => entry.tier === shown) ?? tiers[0];
  if (!current) return null;

  return (
    <div className="md:hidden">
      <nav
        aria-label="Tiers"
        className="sticky top-0 z-20 -mx-4 mb-3 flex gap-2 overflow-x-auto bg-background/95 px-4 py-2 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tiers.map((entry) => {
          const selected = entry.tier === shown;
          return (
            <button
              key={entry.tier}
              type="button"
              aria-pressed={selected}
              onClick={() => setShown(entry.tier)}
              className={`flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-meta font-medium transition-colors duration-quick ${
                selected
                  ? 'border-navy-800 bg-navy-800 text-white'
                  : entry.over > 0
                    ? 'border-destructive/40 bg-late-tint text-destructive'
                    : 'bg-card'
              }`}
            >
              {TIER_LABELS[entry.tier]}
              <span className="font-mono tabular-nums">{entry.rows.length}</span>
            </button>
          );
        })}
      </nav>

      {/* A <section> around the chosen tier, named by its heading, so one tier reads as one thing —
          the same shape the desktop columns have, which is what the assertions about a tier follow. */}
      <section key={current.tier} className="animate-rise-in flex flex-col gap-2">
        <header className="flex flex-col gap-0.5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-title font-semibold">{TIER_LABELS[current.tier]}</h2>
            <span
              aria-label={tierCountLabel(current.rows.length, current.limit)}
              className={`font-mono text-meta tabular-nums ${current.over > 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}
            >
              {current.rows.length}
              {current.limit !== null && ` / ${current.limit}`}
            </span>
            {current.over > 0 && (
              <Badge className="rounded-[10px] bg-late-tint text-label text-destructive">{current.over} over</Badge>
            )}
          </div>
          <p className="text-meta leading-snug text-muted-foreground">{TIER_HINTS[current.tier]}</p>
        </header>

        {current.rows.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-10 text-center text-meta text-muted-foreground">
            Nothing here
          </p>
        ) : (
          // No card borders: fifty rounded rectangles down a phone is fifty outlines to read past.
          <ul className="stagger divide-y rounded-lg border bg-card">
            {current.rows.map(({project, meta}) => (
              <Row key={project.id} project={project} meta={meta} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Row({project, meta}: {project: ProjectRow; meta: ProjectMeta}) {
  return (
    <li className={`border-l-4 first:rounded-tl-lg last:rounded-bl-lg ${projectEdgeClass(project.code ?? project.id)}`}>
      {/* The whole row is the tap target, which at 76px is more than twice the thumb's minimum. */}
      <Link
        href={`/projects/${project.id}`}
        className="flex min-h-[4.75rem] items-center gap-3 px-3 py-2.5 transition-colors duration-quick active:bg-muted"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-baseline gap-2">
            <span className="min-w-0 truncate font-mono text-meta text-muted-foreground">
              {project.code ?? 'No code'}
            </span>
            <Priority priority={project.priority} />
          </div>
          <p className="truncate text-title leading-tight font-semibold">{project.name}</p>
          <p className="truncate text-meta text-muted-foreground">{meta.metaLine}</p>
          {meta.lateTasks > 0 && (
            <p className="truncate text-meta font-medium text-destructive">{lateLine(meta.lateTasks)}</p>
          )}
        </div>
        <ChevronRightIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

function Priority({priority}: {priority: number | null}) {
  if (priority === null) {
    return (
      <span className="ml-auto shrink-0 rounded-md bg-muted px-1.5 font-mono text-label text-muted-foreground">
        Unranked
      </span>
    );
  }
  return (
    <span className="ml-auto shrink-0 rounded-md bg-navy-800 px-1.5 font-mono text-label font-semibold text-white tabular-nums">
      <span className="sr-only">Priority </span>
      {priority}
    </span>
  );
}
