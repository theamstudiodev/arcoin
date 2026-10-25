import type {WeekLoad} from '@/lib/workload';

/**
 * One person, one week, as an 8px track.
 *
 * This is the only place in the app that answers "who has room". The Timeline says what everyone is
 * doing; this says whether Athiq can give Nashwa another drawing without pushing someone's dates out.
 *
 * Colour is never the only cue — the bar carries its own sentence as an accessible name and a tooltip,
 * because a coloured rectangle tells a screen reader nothing, and red tells a colour-blind reader
 * nothing either.
 */
export function CapacityBar({load}: {load: WeekLoad}) {
  if (load.off) {
    return (
      <span
        title={load.label}
        aria-label={load.label}
        className="flex h-2 items-center"
      >
        <span aria-hidden className="h-px w-full rounded-full bg-border" />
      </span>
    );
  }

  return (
    <span title={load.label} aria-label={load.label} className="block h-2 w-full overflow-hidden rounded-full bg-muted">
      <span
        aria-hidden
        // Grown from the left on arrival so a row of four reads as a small chart rather than four
        // static blocks. The width itself is inline: Tailwind cannot emit a class it has not read.
        style={{width: `${load.filledPercent}%`}}
        className={`animate-grow-x block h-full origin-left rounded-full ${
          load.full ? 'bg-destructive' : 'bg-navy-600'
        }`}
      />
    </span>
  );
}
