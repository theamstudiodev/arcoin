'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {isCurrent, linksFor} from '@/app/(app)/nav-links';

/**
 * The working screens, in the navy bar, from `md` up. Below that the phone gets `BottomNav` instead —
 * seven labels never fit across 390px, and a navy strip that scrolls sideways hid four of them.
 *
 * The active screen is marked by a lime rule that grows from the middle, the same mark the bottom bar
 * uses, so the two bars read as one idea at different sizes.
 */
export function TopNav({isAdmin}: {isAdmin: boolean}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Studio" className="hidden min-w-0 items-center gap-0.5 md:flex">
      {linksFor(isAdmin).map(({href, label}) => {
        const current = isCurrent(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? 'page' : undefined}
            className={`relative flex h-10 shrink-0 items-center rounded-md px-3 text-body transition-colors duration-150 ${
              current ? 'font-medium text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {label}
            {current && <span aria-hidden className="animate-grow-x absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-lime-500" />}
          </Link>
        );
      })}
    </nav>
  );
}
