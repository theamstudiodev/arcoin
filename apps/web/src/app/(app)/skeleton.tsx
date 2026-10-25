import type {CSSProperties, ReactNode} from 'react';

/**
 * The shapes a screen shows while its data is on the way.
 *
 * Every screen under (app) is `force-dynamic` and reads the studio on the server, so a navigation
 * waits on a round trip before anything at all appears — on a phone on studio wifi that is long
 * enough to look like a tap that did not register. These stand in for the shape of what is coming,
 * which is the one thing a spinner cannot say.
 *
 * The shimmer is the `skeleton` utility in globals.css, so it stands still under reduced motion with
 * everything else, leaving plain grey blocks. That is still the right answer: the layout is the
 * message, the movement is only the reassurance.
 */

/** One grey block. Sized by the caller, because the shape is the whole point. */
export function Bar({className = '', style}: {className?: string; style?: CSSProperties}) {
  return <div style={style} className={`skeleton rounded ${className}`} />;
}

/**
 * The frame every loading screen shares: the page's own measure, a heading-sized block, and a label
 * nobody sees. `role="status"` announces that label politely — "Loading the drawing register" —
 * which is the one thing a screen reader gets nothing of from a page of grey rectangles. Next's
 * route announcer names the screen separately once it arrives.
 */
export function LoadingShell({
  measure,
  what,
  children,
}: {
  measure: string;
  /** Named in the announcement: "Loading the drawing register". */
  what: string;
  children: ReactNode;
}) {
  return (
    <div role="status" className={`mx-auto w-full ${measure}`}>
      <span className="sr-only">Loading {what}</span>
      <Bar className="mb-5 h-8 w-48" />
      {children}
    </div>
  );
}

/** A card with a heading line and `rows` lines under it, which is the shape of most of this app. */
export function CardBlock({rows = 3, className = ''}: {rows?: number; className?: string}) {
  return (
    <div className={`rounded-lg border bg-card p-4 ${className}`}>
      <Bar className="h-4 w-1/3" />
      <div className="mt-4 flex flex-col gap-2.5">
        {Array.from({length: rows}, (_, row) => (
          <Bar key={row} className="h-3.5 w-full" />
        ))}
      </div>
    </div>
  );
}
