'use client';

import {MoreHorizontalIcon, XIcon} from 'lucide-react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {isCurrent, linksFor} from '@/app/(app)/nav-links';

const ITEM =
  'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 ' +
  'text-label transition-colors duration-150';
// The lime rule above the active item, drawn from the middle out. It is the only thing on the bar that moves.
const MARK = 'absolute inset-x-3 top-0 h-0.5 rounded-full bg-lime-500 animate-grow-x';

/**
 * The phone's navigation. Athiq runs the studio from a phone, and seven labels will not fit across 390px —
 * the top bar used to scroll sideways, which meant Timeline, Clashes, People and Settings were reachable
 * only by someone who thought to swipe a navy strip. Four destinations sit on the bar; the rest open from
 * More.
 *
 * Hidden from `md` up, where the top bar carries the same links with room to spare.
 */
export function BottomNav({isAdmin}: {isAdmin: boolean}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const links = linksFor(isAdmin);
  const onBar = links.filter((link) => link.onBar);
  const behindMore = links.filter((link) => !link.onBar);

  const moreHoldsCurrent = behindMore.some((link) => isCurrent(pathname, link.href));

  return (
    <>
      {moreOpen && (
        <button
          type="button"
          aria-label="Close"
          onClick={() => setMoreOpen(false)}
          className="animate-fade-in fixed inset-0 z-40 bg-navy-900/40 md:hidden"
        />
      )}

      {moreOpen && (
        <div className="animate-slide-up pb-safe fixed inset-x-0 bottom-14 z-50 border-t bg-card md:hidden">
          <ul className="flex flex-col divide-y">
            {behindMore.map(({href, label, icon: Icon}, index) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isCurrent(pathname, href) ? 'page' : undefined}
                  // Closed on the tap rather than by watching the path: a sheet that waits for the
                  // navigation to land stays over the top of the screen it just opened.
                  onClick={() => setMoreOpen(false)}
                  // The delay is inline rather than a class: Tailwind only emits class names it can read
                  // literally in the source, and a stagger is a different delay per row.
                  style={{animationDelay: `${index * 40}ms`}}
                  className={`animate-rise-in flex min-h-14 items-center gap-3 px-5 text-body ${
                    isCurrent(pathname, href) ? 'font-semibold text-navy-800' : ''
                  }`}
                >
                  <Icon className="size-5 shrink-0 text-navy-600" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Named apart from the top bar's nav: both are in the DOM at every width and only one is shown,
          so two landmarks called "Studio" would be read out twice by a screen reader. */}
      <nav
        aria-label="Studio, bottom bar"
        className="pb-safe fixed inset-x-0 bottom-0 z-50 flex h-14 items-stretch border-t border-navy-700 bg-navy-800 text-white md:hidden"
      >
        {onBar.map(({href, label, icon: Icon}) => {
          const current = isCurrent(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={current ? 'page' : undefined}
              className={`${ITEM} ${current ? 'text-lime-500' : 'text-white/70'}`}
            >
              {current && <span aria-hidden className={MARK} />}
              <Icon className="size-5 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          className={`${ITEM} ${moreOpen || moreHoldsCurrent ? 'text-lime-500' : 'text-white/70'}`}
        >
          {moreHoldsCurrent && !moreOpen && <span aria-hidden className={MARK} />}
          {moreOpen ? <XIcon className="size-5 shrink-0" /> : <MoreHorizontalIcon className="size-5 shrink-0" />}
          <span className="truncate">More</span>
        </button>
      </nav>
    </>
  );
}
