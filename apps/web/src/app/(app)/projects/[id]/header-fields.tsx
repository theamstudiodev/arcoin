'use client';

import {type ReactNode, useId, useState, useTransition} from 'react';
import type {LeadChoice} from '@/app/(app)/projects/project-dialog';
import {Input} from '@/components/ui/input';
import {NativeSelect, NativeSelectOption} from '@/components/ui/native-select';
import {updateProject} from '@/lib/actions/projects';
import {type ProjectTier, TIER_LABELS, TIER_ORDER} from '@/lib/project-rules';
import type {ProjectRow} from '@/lib/projects';

const LABEL = 'text-label font-medium text-muted-foreground uppercase';
// Thumb-sized on a phone, tighter at a desk, like every other control in the app.
const CONTROL = 'h-11 md:h-9';
const SELECT = 'w-full [&>select]:h-11 md:[&>select]:h-9';
// The two a phone shows are the only two it can change, so they are shaped to say so.
const PILL = `${SELECT} [&>select]:rounded-full md:[&>select]:rounded-md`;

/**
 * The project's details, editable in place under its name.
 *
 * Every screen in this app that edits one value at a time saves when the field is left — Settings
 * set that pattern and the studio reads it as "typed, therefore saved". There is no Save button to
 * forget, and no dialog to open for a priority somebody wants to change while walking to a meeting.
 *
 * A phone shows Tier and Priority and nothing else. That is the scope's call, not a shortcut: the
 * other four are read on a phone and typed at a desk, and four more fields on a 390px header would
 * push the packages below the fold on a screen whose job is to show them.
 *
 * Admins only. The database refuses a project row's update to everybody else — including the
 * project's own lead, who may change its drawings but not where it sits on the board.
 */
export function HeaderFields({project, leads}: {project: ProjectRow; leads: readonly LeadChoice[]}) {
  const ids = useId();
  const [saved, setSaved] = useState(project);
  const [draft, setDraft] = useState(project);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(changes: Partial<ProjectRow>) {
    // Built from what the database last accepted, never from the draft. Otherwise changing the Tier
    // while a half-typed client name sits in the field beside it would save "Mr. R" along with it.
    const next = {...saved, ...changes};
    setDraft({...draft, ...changes});
    startTransition(async () => {
      const result = await updateProject({
        id: project.id,
        code: next.code,
        name: next.name,
        client: next.client,
        project_type: next.project_type,
        tier: next.tier,
        priority: next.priority,
        lead_id: next.lead_id,
        target_date: next.target_date,
      });
      if (result.ok) {
        setSaved(next);
        setError(null);
        return;
      }
      // Put the header back to the last thing the database accepted, so it never shows an edit that
      // did not happen — the same rule the board's cards follow.
      setDraft(saved);
      setError(result.error);
    });
  }

  /** Text and number fields commit when they are left, and only if they actually changed. */
  const commit = (field: 'client' | 'project_type' | 'priority', value: string) => {
    const next = field === 'priority' ? (value === '' ? null : Number(value)) : value === '' ? null : value;
    if (next !== saved[field]) save({[field]: next} as Partial<ProjectRow>);
  };

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 md:mt-4 md:grid-cols-6 md:gap-3">
      <Field id={`${ids}-client`} label="Client" className="hidden md:block">
        <Input
          id={`${ids}-client`}
          value={draft.client ?? ''}
          disabled={pending}
          onChange={(event) => setDraft({...draft, client: event.target.value})}
          onBlur={(event) => commit('client', event.target.value)}
          className={CONTROL}
        />
      </Field>

      <Field id={`${ids}-tier`} label="Tier">
        <NativeSelect
          id={`${ids}-tier`}
          value={draft.tier}
          disabled={pending}
          onChange={(event) => save({tier: event.target.value as ProjectTier})}
          className={PILL}
        >
          {TIER_ORDER.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {TIER_LABELS[value]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>

      <Field id={`${ids}-priority`} label="Priority">
        <Input
          id={`${ids}-priority`}
          type="number"
          inputMode="numeric"
          min={1}
          max={999}
          placeholder="—"
          value={draft.priority === null ? '' : String(draft.priority)}
          disabled={pending}
          onChange={(event) =>
            setDraft({...draft, priority: event.target.value === '' ? null : Number(event.target.value)})
          }
          onBlur={(event) => commit('priority', event.target.value)}
          className={`${CONTROL} rounded-full text-center tabular-nums md:rounded-md md:text-left`}
        />
      </Field>

      <Field id={`${ids}-lead`} label="Project Architect" className="hidden md:block">
        <NativeSelect
          id={`${ids}-lead`}
          value={draft.lead_id ?? ''}
          disabled={pending}
          onChange={(event) => save({lead_id: event.target.value === '' ? null : event.target.value})}
          className={SELECT}
        >
          <NativeSelectOption value="">Nobody yet</NativeSelectOption>
          {leads.map((lead) => (
            <NativeSelectOption key={lead.id} value={lead.id}>
              {lead.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>

      <Field id={`${ids}-target`} label="Target completion" className="hidden md:block">
        <Input
          id={`${ids}-target`}
          type="date"
          value={draft.target_date ?? ''}
          disabled={pending}
          onChange={(event) => save({target_date: event.target.value === '' ? null : event.target.value})}
          className={CONTROL}
        />
      </Field>

      <Field id={`${ids}-type`} label="Type" className="hidden md:block">
        <Input
          id={`${ids}-type`}
          value={draft.project_type ?? ''}
          disabled={pending}
          onChange={(event) => setDraft({...draft, project_type: event.target.value})}
          onBlur={(event) => commit('project_type', event.target.value)}
          className={CONTROL}
        />
      </Field>

      {error && (
        <p role="alert" className="col-span-full text-body text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  className = '',
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {children}
    </div>
  );
}
