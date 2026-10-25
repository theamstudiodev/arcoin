'use client';

import {XIcon} from 'lucide-react';
import {type SubmitEvent, useId, useState, useTransition} from 'react';
import {ALERT, FIELD_LABEL, type SaveState, SettingsCard} from '@/app/(app)/settings/settings-card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {addHoliday, removeHoliday, setWorkdays} from '@/lib/actions/settings';
import {formatShortDate} from '@/lib/format';
import {holidaySchema, workdaysSchema} from '@/lib/schemas/settings';
import type {HolidayRow} from '@/lib/settings';
import {toggleWorkday, WEEKDAYS} from '@/lib/settings-rules';

const ADMIN_NOTE = 'Working days and holidays set the capacity every forecast is built from.';
const STAFF_NOTE = 'Only Asif or Athiq can change the working days and holidays.';

// A working day is navy because navy is interaction; a day off is left as an outline. The letters carry it
// too, so the week still reads without colour.
const DAY_BASE = 'grid h-11 w-full place-items-center rounded-md border text-meta font-medium md:h-9 md:w-9';
const DAY_ON = 'border-navy-800 bg-navy-800 text-white';
const DAY_OFF = 'border-input text-muted-foreground';
const CHIP = 'flex items-center gap-2 rounded-[10px] border bg-background py-0.5 pl-2.5';

/**
 * The studio's week and the days it closes. Both feed the scheduler's capacity, so a change here moves
 * every forecast date — which is why each one saves on its own and says so, rather than waiting behind a
 * form full of changes.
 *
 * Holidays can only be added and removed: the table has no update policy, so correcting a date is taking
 * the wrong one off and putting the right one on.
 */
export function CalendarCard({
  workdays,
  holidays,
  canEdit,
}: {
  workdays: readonly number[];
  holidays: readonly HolidayRow[];
  canEdit: boolean;
}) {
  const id = useId();
  const [week, setWeek] = useState(workdays);
  const [closed, setClosed] = useState(holidays);
  const [day, setDay] = useState('');
  const [label, setLabel] = useState('');
  const [weekError, setWeekError] = useState<string | null>(null);
  const [holidayError, setHolidayError] = useState<string | null>(null);
  const [state, setState] = useState<SaveState>('idle');
  const [, startTransition] = useTransition();

  function toggle(weekday: number) {
    const next = toggleWorkday(week, weekday);
    const parsed = workdaysSchema.safeParse({workdays: next});
    if (!parsed.success) {
      // Turning the last day off would leave the studio working no days at all, and the engine nothing to fill.
      setWeekError(parsed.error.issues[0]?.message ?? 'Pick at least one working day.');
      setState('idle');
      return;
    }

    const before = week;
    setWeek(next);
    setWeekError(null);
    setState('saving');
    startTransition(async () => {
      const result = await setWorkdays({workdays: next});
      if (result.ok) {
        setState('saved');
        return;
      }
      // Put the week back: the row of days never shows a change the database refused.
      setWeek(before);
      setWeekError(result.error);
      setState('idle');
    });
  }

  function add(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = holidaySchema.safeParse({day, label});
    if (!parsed.success) {
      setHolidayError(parsed.error.issues[0]?.message ?? 'Pick a date for the holiday.');
      setState('idle');
      return;
    }

    setHolidayError(null);
    setState('saving');
    startTransition(async () => {
      const result = await addHoliday({day, label});
      if (!result.ok) {
        setHolidayError(result.error);
        setState('idle');
        return;
      }
      const added = {day: parsed.data.day, label: parsed.data.label};
      setClosed((current) => [...current, added].sort((a, b) => a.day.localeCompare(b.day)));
      setDay('');
      setLabel('');
      setState('saved');
    });
  }

  function remove(holiday: HolidayRow) {
    setHolidayError(null);
    setState('saving');
    startTransition(async () => {
      const result = await removeHoliday({day: holiday.day});
      if (!result.ok) {
        setHolidayError(result.error);
        setState('idle');
        return;
      }
      setClosed((current) => current.filter((other) => other.day !== holiday.day));
      setState('saved');
    });
  }

  return (
    <SettingsCard heading="Calendar" state={state} note={canEdit ? ADMIN_NOTE : STAFF_NOTE}>
      <div className="flex flex-col gap-1.5">
        <p id={`${id}-week`} className={FIELD_LABEL}>
          Working days
        </p>
        {/* Phone: seven columns across the card, each 44px tall to tap. Desktop: a tight row of 36px squares. */}
        <div role="group" aria-labelledby={`${id}-week`} className="grid grid-cols-7 gap-1 md:flex md:gap-1.5">
          {WEEKDAYS.map((weekday) => {
            const on = week.includes(weekday.day);
            const style = `${DAY_BASE} ${on ? DAY_ON : DAY_OFF}`;

            return canEdit ? (
              <button
                key={weekday.day}
                type="button"
                aria-label={weekday.name}
                aria-pressed={on}
                onClick={() => toggle(weekday.day)}
                className={`${style} ${on ? '' : 'hover:bg-muted'}`}
              >
                {weekday.short}
              </button>
            ) : (
              <span key={weekday.day} className={style}>
                {weekday.short}
                <span className="sr-only">{on ? ' is a working day' : ' is not a working day'}</span>
              </span>
            );
          })}
        </div>
        {weekError && (
          <p role="alert" className={ALERT}>
            {weekError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className={FIELD_LABEL}>Holidays</p>
        {canEdit && (
          <form onSubmit={add} noValidate className="grid gap-2 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto]">
            {/* Labelled by hand: the row reads as one control, and "Date" above a date field says nothing. */}
            <Input
              id={`${id}-day`}
              type="date"
              value={day}
              onChange={(event) => setDay(event.target.value)}
              aria-label="Date"
              className="h-11 md:h-9"
            />
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Name, like Christmas"
              maxLength={60}
              aria-label="Holiday name"
              className="h-11 md:h-9"
            />
            <Button type="submit" variant="outline" className="h-11 px-3 md:h-9">
              Add holiday
            </Button>
          </form>
        )}
        {closed.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-4 text-center text-meta text-muted-foreground">
            No holidays yet
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {closed.map((holiday) => (
              <li key={holiday.day} className={`${CHIP} ${canEdit ? '' : 'pr-2.5'}`}>
                <span className="font-mono text-meta tabular-nums">{holiday.day}</span>
                {holiday.label && <span className="text-meta text-muted-foreground">{holiday.label}</span>}
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${formatShortDate(holiday.day)}`}
                    onClick={() => remove(holiday)}
                    className="-my-0.5 size-11 text-muted-foreground md:size-8"
                  >
                    <XIcon />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {holidayError && (
          <p role="alert" className={ALERT}>
            {holidayError}
          </p>
        )}
      </div>
    </SettingsCard>
  );
}
