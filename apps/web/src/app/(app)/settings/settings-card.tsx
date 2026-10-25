import type {ReactNode} from 'react';

export type SaveState = 'idle' | 'saving' | 'saved';

/** 12px muted, above its field — these labels are whole phrases, so the screen's usual 11px caps would shout. */
export const FIELD_LABEL = 'text-meta font-medium text-muted-foreground';
export const ALERT = 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-body text-red-700';

/**
 * One card on the Settings screen, with the lime Saved flag beside its heading. The flag earns its place
 * because changes here save on blur: without it nothing on screen would say the rule had actually moved.
 * It stays until the next change rather than fading, so Athiq can look away and still know where he is.
 */
export function SettingsCard({
  heading,
  state,
  note,
  children,
}: {
  heading: string;
  state: SaveState;
  note: string;
  children: ReactNode;
}) {
  const headingId = `${heading.toLowerCase().replace(/\s+/g, '-')}-heading`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <div className="flex items-baseline gap-2">
        <h2 id={headingId} className="font-heading text-section font-semibold">
          {heading}
        </h2>
        {/* Always in the tree, so a screen reader announces the save rather than the arrival of a new element. */}
        <p role="status" className="text-meta">
          {state === 'saving' && <span className="text-muted-foreground">Saving…</span>}
          {state === 'saved' && (
            <span className="rounded-[10px] bg-lime-100 px-2 py-0.5 font-medium text-navy-900">Saved</span>
          )}
        </p>
      </div>
      {children}
      <p className="mt-auto text-meta text-muted-foreground">{note}</p>
    </section>
  );
}
