'use client';

import Link from 'next/link';
import {type KeyboardEvent, useState, useTransition} from 'react';
import {type LeadChoice, ProjectDialog} from '@/app/(app)/projects/project-dialog';
import {Input} from '@/components/ui/input';
import {NativeSelect, NativeSelectOption} from '@/components/ui/native-select';
import {moveProject} from '@/lib/actions/projects';
import type {ProjectMeta} from '@/lib/board';
import {lateLine} from '@/lib/board';
import {projectEdgeClass} from '@/lib/project-colours';
import {type ProjectTier, TIER_LABELS, TIER_ORDER} from '@/lib/project-rules';
import type {ProjectRow} from '@/lib/projects';

const META = 'truncate text-meta text-muted-foreground';

/**
 * One project on the board. Admins get the tier and priority controls here, because moving a
 * project and re-ranking it is the change Athiq makes on a Monday morning — it should not need
 * the whole form. The database refuses anyone else's change whatever this shows.
 */
export function ProjectCard({
  project,
  meta,
  leads,
  canEdit,
}: {
  project: ProjectRow;
  meta: ProjectMeta;
  leads: readonly LeadChoice[];
  canEdit: boolean;
}) {
  return (
    <li
      className={`flex flex-col gap-1.5 rounded-lg border border-l-4 bg-card p-2.5 transition-[transform,border-color] duration-quick hover:-translate-y-0.5 hover:border-navy-400 ${projectEdgeClass(project.code ?? project.id)}`}
    >
      <div className="flex items-start gap-2">
        <PriorityChip priority={project.priority} />
        <div className="min-w-0 flex-1">
          {/* The card title is the way into the project. Nothing else on the board navigated there. */}
          <Link
            href={`/projects/${project.id}`}
            className="block truncate text-title leading-tight font-semibold transition-colors duration-quick hover:text-navy-700"
          >
            {project.name}
          </Link>
          {project.code && <p className={`${META} font-mono`}>{project.code}</p>}
        </div>
        {canEdit && <ProjectDialog project={project} leads={leads} />}
      </div>

      {/* What the engine worked out this morning, not what someone typed in months ago. */}
      <p className={META}>{meta.metaLine}</p>

      {meta.lateTasks > 0 && <p className="truncate text-meta font-medium text-destructive">{lateLine(meta.lateTasks)}</p>}

      {canEdit && <MoveControls project={project} />}
    </li>
  );
}

function PriorityChip({priority}: {priority: number | null}) {
  if (priority === null) {
    return (
      <span
        aria-label="Unranked"
        className="grid size-7 shrink-0 place-items-center rounded-md bg-muted font-mono text-label text-muted-foreground"
      >
        —
      </span>
    );
  }
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-navy-800 font-mono text-meta font-semibold text-white tabular-nums">
      <span className="sr-only">Priority </span>
      {priority}
    </span>
  );
}

function MoveControls({project}: {project: ProjectRow}) {
  const [tier, setTier] = useState<ProjectTier>(project.tier);
  const [priority, setPriority] = useState(project.priority === null ? '' : String(project.priority));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function move(next: {tier: ProjectTier; priority: string}) {
    setTier(next.tier);
    setPriority(next.priority);
    startTransition(async () => {
      const result = await moveProject({id: project.id, tier: next.tier, priority: next.priority});
      if (result.ok) {
        setError(null);
        return;
      }
      // Put the card back where it was, so the board never shows a move that did not happen.
      setTier(project.tier);
      setPriority(project.priority === null ? '' : String(project.priority));
      setError(result.error);
    });
  }

  const commitPriority = () => {
    const unchanged = priority === (project.priority === null ? '' : String(project.priority));
    if (!unchanged) move({tier, priority});
  };

  return (
    <div className="flex flex-col gap-1.5 border-t pt-2">
      <div className="flex items-center gap-2">
        <NativeSelect
          aria-label={`Tier for ${project.name}`}
          value={tier}
          disabled={pending}
          onChange={(event) => move({tier: event.target.value as ProjectTier, priority})}
          className="min-w-0 flex-1 [&>select]:md:h-9"
        >
          {TIER_ORDER.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {TIER_LABELS[value]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Input
          aria-label={`Priority for ${project.name}`}
          type="number"
          inputMode="numeric"
          min={1}
          max={999}
          placeholder="—"
          value={priority}
          disabled={pending}
          onChange={(event) => setPriority(event.target.value)}
          onBlur={commitPriority}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          className="w-16 shrink-0 px-2 text-center tabular-nums md:h-9"
        />
      </div>
      {error && (
        <p role="alert" className="text-body text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
