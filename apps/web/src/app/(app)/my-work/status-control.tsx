'use client';

import {useState, useTransition} from 'react';
import {setTaskStatus} from '@/lib/actions/tasks';
import {TASK_STATUS_LABELS, TASK_STATUS_ORDER, type TaskStatus} from '@/lib/task-rules';

/**
 * The five statuses, as one tap each.
 *
 * Changing a status is the only thing Bushra and Nashwa do on a phone, so this is the loudest thing
 * on the card rather than a select tucked at the end of a row. Five 44px targets will not fit across
 * 358px, so they wrap three and two instead of shrinking below the thumb — the real words are worth
 * more than one tidy row.
 */
export function StatusControl({taskId, status, title}: {taskId: string; status: TaskStatus; title: string}) {
  const [current, setCurrent] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(next: TaskStatus) {
    if (next === current) return;
    const previous = current;
    setCurrent(next);
    startTransition(async () => {
      const result = await setTaskStatus({id: taskId, status: next});
      if (result.ok) {
        setError(null);
        return;
      }
      // Put it back: the card must never show a status the database refused.
      setCurrent(previous);
      setError(result.error);
    });
  }

  return (
    <div className="mt-2">
      <div role="group" aria-label={`Status for ${title}`} className="grid max-w-xl grid-cols-3 gap-1 md:grid-cols-5">
        {TASK_STATUS_ORDER.map((option) => {
          const active = option === current;
          // Issued is the one lime fill in the system: it means finished and gone out.
          const tone = active
            ? option === 'issued'
              // The one moment worth marking: a drawing has gone out. A single 3% swell, not a bounce.
              ? 'animate-pop bg-lime-500 text-navy-900 font-medium'
              : 'bg-navy-800 text-white font-medium'
            : 'bg-muted text-muted-foreground hover:bg-muted/70';
          return (
            <button
              key={option}
              type="button"
              disabled={pending}
              aria-pressed={active}
              onClick={() => choose(option)}
              className={`h-11 rounded-md px-1 text-body transition-colors duration-brisk disabled:opacity-60 md:h-10 ${tone}`}
            >
              {TASK_STATUS_LABELS[option]}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-body text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
