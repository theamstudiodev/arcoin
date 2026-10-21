'use client';

import {type KeyboardEvent, useId, useState, useTransition} from 'react';
import {FIELD_LABEL, type SaveState, SettingsCard} from '@/app/(app)/settings/settings-card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {fieldErrorsOf} from '@/lib/actions/result';
import {updateStudioRules} from '@/lib/actions/settings';
import {type StudioRulesPatchInput, studioRulesPatchSchema} from '@/lib/schemas/settings';
import type {SettingsRow} from '@/lib/settings';
import {STUDIO_RULES, type StudioRule, type StudioRuleKey} from '@/lib/settings-rules';

type RuleValues = Record<StudioRuleKey, string>;

const ADMIN_NOTE = 'Production hours set every forecast the studio works to.';
const STAFF_NOTE = "Only Asif or Athiq can change the studio's rules.";

/** The rules as the fields hold them. Strings, because a half-typed number is still a thing on screen. */
function valuesOf(settings: SettingsRow): RuleValues {
  return {
    hours_per_day: String(settings.hours_per_day),
    slot_limit: String(settings.slot_limit),
    per_lead_slots: String(settings.per_lead_slots),
    dev_limit: String(settings.dev_limit),
    ready_limit: String(settings.ready_limit),
    dormant_days: String(settings.dormant_days),
  };
}

/**
 * The six numbers the studio runs on. Each field saves itself on blur — there is no Save button, because
 * these are six unrelated rules rather than one form, and Athiq changes one of them at a time.
 *
 * Staff see the numbers as plain text: the database refuses their writes, so offering them a field would be
 * offering a control that cannot work.
 */
export function StudioRulesCard({settings, canEdit}: {settings: SettingsRow; canEdit: boolean}) {
  const id = useId();
  const [stored, setStored] = useState(() => valuesOf(settings));
  const [draft, setDraft] = useState(stored);
  const [errors, setErrors] = useState<Partial<Record<StudioRuleKey, string>>>({});
  const [state, setState] = useState<SaveState>('idle');
  const [, startTransition] = useTransition();

  function change(key: StudioRuleKey, value: string) {
    setDraft((current) => ({...current, [key]: value}));
    // The flag belongs to the last save, not to what is being typed now.
    setState('idle');
  }

  function commit(rule: StudioRule) {
    const typed = draft[rule.key];
    if (typed === stored[rule.key]) return;

    const patch: StudioRulesPatchInput = {[rule.key]: typed};
    const parsed = studioRulesPatchSchema.safeParse(patch);
    if (!parsed.success) {
      // The number they typed stays in the field: nothing was saved, and they are one keystroke from fixing it.
      setErrors((current) => ({...current, ...fieldErrorsOf(parsed.error)}));
      setState('idle');
      return;
    }

    setErrors((current) => ({...current, [rule.key]: undefined}));
    setState('saving');
    startTransition(async () => {
      const result = await updateStudioRules(patch);
      if (result.ok) {
        setStored((current) => ({...current, [rule.key]: typed}));
        setState('saved');
        return;
      }
      setErrors((current) => ({...current, [rule.key]: result.fieldErrors?.[rule.key] ?? result.error}));
      setState('idle');
    });
  }

  return (
    <SettingsCard heading="Studio rules" state={state} note={canEdit ? ADMIN_NOTE : STAFF_NOTE}>
      {/* Phone: one rule under the next. From 640px: the two-column grid the partners read on a laptop. */}
      <ul className="grid gap-3 sm:grid-cols-2">
        {STUDIO_RULES.map((rule) => {
          const fieldId = `${id}-${rule.key}`;
          const error = errors[rule.key];

          return (
            <li key={rule.key} className="flex flex-col gap-1.5">
              {canEdit ? (
                <>
                  <Label htmlFor={fieldId} className={FIELD_LABEL}>
                    {rule.label}
                  </Label>
                  <Input
                    id={fieldId}
                    type="number"
                    inputMode={rule.step === 1 ? 'numeric' : 'decimal'}
                    min={rule.min}
                    max={rule.max}
                    step={rule.step}
                    value={draft[rule.key]}
                    onChange={(event) => change(rule.key, event.target.value)}
                    onBlur={() => commit(rule)}
                    onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                    }}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${fieldId}-error` : undefined}
                    className="h-11 tabular-nums md:h-9"
                  />
                </>
              ) : (
                <>
                  <p className={FIELD_LABEL}>{rule.label}</p>
                  <p className="font-mono text-[15px] tabular-nums">{stored[rule.key]}</p>
                </>
              )}
              {error && (
                // A save with no button needs its refusal announced: nobody is watching for it.
                <p id={`${fieldId}-error`} role="alert" className="text-[13px] text-destructive">
                  {error}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </SettingsCard>
  );
}
