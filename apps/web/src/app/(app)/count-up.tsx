'use client';

import {useEffect, useState} from 'react';
import {formatHours} from '@/lib/tasks';

/** Matches --transition-duration-draw: the same length the timeline's bars take to grow. */
const DURATION = 420;

/**
 * A statistic that counts up to itself once, when the screen first draws.
 *
 * It starts at the real figure rather than at zero, so the server's HTML and the first client render
 * agree, and so the number is right for everyone who never reaches the ramp: no JavaScript, reduced
 * motion, or a printed page. The animation is something the figure does after it is already correct,
 * never the only way to arrive at it.
 *
 * The ramping figure is hidden from assistive technology and the real one is read instead. A number
 * changing sixty times a second is not information, and a screen reader that happened to reach it
 * mid-ramp would otherwise announce a studio with four hundred hours left instead of six hundred.
 */
export function CountUp({value, as = 'whole'}: {value: number; as?: 'whole' | 'hours'}) {
  // Named, not a formatting function passed in: these cross a Server Component boundary, and only
  // serialisable props may. Hours go in half-hour steps and a count of late drawings is a count.
  const format = as === 'hours' ? formatHours : Math.round;
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    // Taken from the first frame rather than from the effect, so a slow hydration does not eat the ramp.
    let started: number | undefined;

    const step = (now: number) => {
      started ??= now;
      const through = Math.min((now - started) / DURATION, 1);
      // The curve of --ease-enter: quick away, settling rather than stopping.
      setShown(value * (1 - (1 - through) ** 3));
      if (through < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <>
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden className="tabular-nums">
        {format(shown)}
      </span>
    </>
  );
}
