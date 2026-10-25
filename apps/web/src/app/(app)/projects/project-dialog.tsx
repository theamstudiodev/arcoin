'use client';

import {PencilIcon, PlusIcon} from 'lucide-react';
import {type ReactNode, type SubmitEvent, useId, useState, useTransition} from 'react';
import {Button} from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {NativeSelect, NativeSelectOption} from '@/components/ui/native-select';
import {addProject, updateProject} from '@/lib/actions/projects';
import {fieldErrorsOf} from '@/lib/actions/result';
import {type ProjectTier, TIER_LABELS, TIER_ORDER} from '@/lib/project-rules';
import type {ProjectRow} from '@/lib/projects';
import {projectSchema} from '@/lib/schemas/project';

// Light working screen: 11px uppercase labels, 44px fields on a phone.
const LABEL = 'text-label font-medium text-muted-foreground uppercase';
const FIELD = 'h-11 md:h-9';
const SELECT = 'w-full [&>select]:h-11 md:[&>select]:h-9';
const ALERT = 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-body text-red-700';

export interface LeadChoice {
  id: string;
  name: string;
}

/** Adds a project (no `project`) or edits one. The page shows it to admins only; the database refuses anyone else. */
export function ProjectDialog({project, leads}: {project?: ProjectRow; leads: readonly LeadChoice[]}) {
  const [open, setOpen] = useState(false);
  const title = project ? `Edit ${project.name}` : 'Add project';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {project ? (
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={title}
              className="-my-1 size-11 text-muted-foreground md:my-0 md:size-8"
            />
          }
        >
          <PencilIcon />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button variant="outline" className={`${FIELD} px-3`} />}>
          <PlusIcon />
          Add project
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
        </DialogHeader>
        {/* The form lives inside the dialog, so it starts fresh from the saved values each time it opens. */}
        <ProjectForm project={project} leads={leads} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ProjectForm({
  project,
  leads,
  onSaved,
}: {
  project?: ProjectRow;
  leads: readonly LeadChoice[];
  onSaved: () => void;
}) {
  const id = useId();
  const [name, setName] = useState(project?.name ?? '');
  const [code, setCode] = useState(project?.code ?? '');
  const [client, setClient] = useState(project?.client ?? '');
  const [projectType, setProjectType] = useState(project?.project_type ?? '');
  const [tier, setTier] = useState<ProjectTier>(project?.tier ?? 'ready_to_release');
  const [priority, setPriority] = useState(project?.priority === null ? '' : String(project?.priority ?? ''));
  const [leadId, setLeadId] = useState(project?.lead_id ?? '');
  const [targetDate, setTargetDate] = useState(project?.target_date ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = projectSchema.safeParse({
      name,
      code,
      client,
      project_type: projectType,
      tier,
      priority,
      lead_id: leadId,
      target_date: targetDate,
    });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsOf(parsed.error));
      setError(null);
      return;
    }
    setFieldErrors({});
    setError(null);
    startTransition(async () => {
      const result = project ? await updateProject({...parsed.data, id: project.id}) : await addProject(parsed.data);
      if (result.ok) {
        onSaved();
        return;
      }
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field id={`${id}-name`} label="Name" error={fieldErrors.name}>
        <Input
          id={`${id}-name`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? `${id}-name-error` : undefined}
          className={FIELD}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-code`} label="Project code" error={fieldErrors.code} hint="Optional, e.g. AMS-26-014">
          <Input
            id={`${id}-code`}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={Boolean(fieldErrors.code)}
            aria-describedby={`${id}-code-${fieldErrors.code ? 'error' : 'hint'}`}
            className={`${FIELD} font-mono`}
          />
        </Field>
        <Field id={`${id}-client`} label="Client" error={fieldErrors.client}>
          <Input
            id={`${id}-client`}
            value={client}
            onChange={(event) => setClient(event.target.value)}
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors.client)}
            className={FIELD}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-tier`} label="Tier" error={fieldErrors.tier}>
          <NativeSelect
            id={`${id}-tier`}
            value={tier}
            onChange={(event) => setTier(event.target.value as ProjectTier)}
            className={SELECT}
          >
            {TIER_ORDER.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {TIER_LABELS[value]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field
          id={`${id}-priority`}
          label="Priority"
          error={fieldErrors.priority}
          hint="1 is most urgent. Blank is unranked."
        >
          <Input
            id={`${id}-priority`}
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            aria-invalid={Boolean(fieldErrors.priority)}
            aria-describedby={`${id}-priority-${fieldErrors.priority ? 'error' : 'hint'}`}
            className={`${FIELD} tabular-nums`}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-lead`} label="Project Architect" error={fieldErrors.lead_id}>
          <NativeSelect
            id={`${id}-lead`}
            value={leadId}
            onChange={(event) => setLeadId(event.target.value)}
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
        <Field id={`${id}-type`} label="Project type" error={fieldErrors.project_type}>
          <Input
            id={`${id}-type`}
            value={projectType}
            onChange={(event) => setProjectType(event.target.value)}
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors.project_type)}
            className={FIELD}
          />
        </Field>
      </div>

      <Field id={`${id}-target`} label="Target date" error={fieldErrors.target_date}>
        <Input
          id={`${id}-target`}
          type="date"
          value={targetDate}
          onChange={(event) => setTargetDate(event.target.value)}
          aria-invalid={Boolean(fieldErrors.target_date)}
          className={FIELD}
        />
      </Field>

      {error && (
        <p role="alert" className={ALERT}>
          {error}
        </p>
      )}

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="ghost" className={FIELD} />}>Cancel</DialogClose>
        <Button type="submit" disabled={pending} className={FIELD}>
          {pending ? 'Saving…' : project ? 'Save changes' : 'Add project'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className={LABEL}>
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-meta text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-meta text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
