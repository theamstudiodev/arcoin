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
import {Switch} from '@/components/ui/switch';
import {addPerson, updatePerson} from '@/lib/actions/people';
import {fieldErrorsOf} from '@/lib/actions/result';
import {formatCapacity} from '@/lib/format';
import type {PersonRow} from '@/lib/people';
import {type PersonRole, ROLE_LABELS} from '@/lib/roles';
import {personSchema} from '@/lib/schemas/person';

const CAPACITY_CHOICES = [1, 0.75, 0.5, 0.25];

// Light working screen: 11px uppercase labels, 44px fields on a phone, the late/over-limit red for errors.
const LABEL = 'text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase';
const FIELD = 'h-11 md:h-9';
const SELECT = 'w-full [&>select]:h-11 md:[&>select]:h-9';
const ALERT = 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700';

/** Adds a person (no `person`) or edits one. The page shows it to admins only; the database refuses anyone else. */
export function PersonDialog({person}: {person?: PersonRow}) {
  const [open, setOpen] = useState(false);
  const title = person ? `Edit ${person.name}` : 'Add person';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {person ? (
        <DialogTrigger
          render={
            // 44px to tap on a phone, overlapping the row's padding so the row stays compact.
            <Button
              variant="ghost"
              size="icon"
              aria-label={title}
              className="-my-1.5 size-11 text-muted-foreground md:my-0 md:size-8"
            />
          }
        >
          <PencilIcon />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button variant="outline" className={`${FIELD} px-3`} />}>
          <PlusIcon />
          Add person
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
        </DialogHeader>
        {/* The form lives inside the dialog, so it starts fresh from the saved values each time it opens. */}
        <PersonForm person={person} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PersonForm({person, onSaved}: {person?: PersonRow; onSaved: () => void}) {
  const id = useId();
  const [name, setName] = useState(person?.name ?? '');
  const [email, setEmail] = useState(person?.email ?? '');
  const [role, setRole] = useState<PersonRole>(person?.role ?? 'junior');
  const [capacity, setCapacity] = useState(person?.capacity ?? 1);
  const [active, setActive] = useState(person?.active ?? true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Their sign-in account is tied to the email it was created with.
  const emailLocked = Boolean(person?.auth_user_id);
  const choices = CAPACITY_CHOICES.includes(capacity)
    ? CAPACITY_CHOICES
    : [...CAPACITY_CHOICES, capacity].sort((a, b) => b - a);

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = personSchema.safeParse({name, email, role, capacity, active});
    if (!parsed.success) {
      setFieldErrors(fieldErrorsOf(parsed.error));
      setError(null);
      return;
    }
    setFieldErrors({});
    setError(null);
    startTransition(async () => {
      const result = person ? await updatePerson({...parsed.data, id: person.id}) : await addPerson(parsed.data);
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

      <Field
        id={`${id}-email`}
        label="Email"
        error={fieldErrors.email}
        hint={emailLocked ? "Used to sign in, so it can't change here." : 'They set their password with this email.'}
      >
        <Input
          id={`${id}-email`}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          readOnly={emailLocked}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={`${id}-email-${fieldErrors.email ? 'error' : 'hint'}`}
          className={`${FIELD} read-only:bg-muted read-only:text-muted-foreground`}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-role`} label="Role" error={fieldErrors.role}>
          <NativeSelect
            id={`${id}-role`}
            value={role}
            onChange={(event) => setRole(event.target.value as PersonRole)}
            className={SELECT}
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field id={`${id}-capacity`} label="Time on production" error={fieldErrors.capacity}>
          <NativeSelect
            id={`${id}-capacity`}
            value={String(capacity)}
            onChange={(event) => setCapacity(Number(event.target.value))}
            className={SELECT}
          >
            {choices.map((choice) => (
              <NativeSelectOption key={choice} value={String(choice)}>
                {formatCapacity(choice)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <div className="flex items-start gap-3">
        <Switch
          id={`${id}-active`}
          checked={active}
          onCheckedChange={setActive}
          aria-describedby={`${id}-active-hint`}
          className="mt-0.5"
        />
        <div className="flex flex-col gap-0.5">
          <Label htmlFor={`${id}-active`} className="text-sm font-medium">
            Active
          </Label>
          <p id={`${id}-active-hint`} className="text-[13px] text-muted-foreground">
            Can sign in and gets scheduled
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className={ALERT}>
          {error}
        </p>
      )}

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="ghost" className={FIELD} />}>Cancel</DialogClose>
        <Button type="submit" disabled={pending} className={FIELD}>
          {pending ? 'Saving…' : person ? 'Save changes' : 'Add person'}
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
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className={LABEL}>
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-[13px] text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
