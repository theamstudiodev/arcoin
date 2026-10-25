import Link from 'next/link';
import {CountUp} from '@/app/(app)/count-up';
import type {BoardSummary} from '@/lib/board';

const STAT = 'inline-flex items-center gap-1.5 font-mono text-meta tabular-nums';
// Lime is a fill with navy on it, never text on white — it reaches 1.5:1 there. So a figure that is at
// its limit is a lime chip, and a figure over it is a red one, which is the same treatment the tier
// counts already use. The spec asks for "the 5/5 in lime" and this is the only way to honour it legibly.
const CHIP = 'rounded-[10px] px-2 py-0.5 text-label font-semibold';

/**
 * The thin strip under the board's heading: the three numbers Athiq checks before he changes anything.
 *
 * It is on this screen rather than in the top bar because the board already pays for the forecast —
 * putting live counts in the shell would run the whole scheduler on Settings and People too.
 */
export function BoardSummary({summary}: {summary: BoardSummary}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 md:mb-6">
      <span className={STAT}>
        <span className={`${CHIP} ${summary.overSlots ? 'bg-late-tint text-destructive' : 'bg-lime-500 text-navy-900'}`}>
          {summary.packagesInProduction} / {summary.slotLimit}
        </span>
        <span className="text-muted-foreground">packages in production</span>
      </span>

      <span className={STAT}>
        <span
          className={`${CHIP} ${summary.overDevelopment ? 'bg-late-tint text-destructive' : 'bg-navy-800/8 text-navy-800'}`}
        >
          {summary.developmentCount} / {summary.devLimit}
        </span>
        <span className="text-muted-foreground">in Development</span>
      </span>

      <Link
        href="/clashes"
        className={`${STAT} rounded-md transition-colors duration-quick hover:text-foreground ${
          summary.clashes > 0 ? 'text-destructive' : 'text-muted-foreground'
        }`}
      >
        <span className="font-semibold">
          <CountUp value={summary.clashes} />
        </span>
        {summary.clashes === 1 ? 'clash' : 'clashes'}
      </Link>
    </div>
  );
}
