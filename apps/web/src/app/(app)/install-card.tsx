'use client';

import {useState, useSyncExternalStore} from 'react';
import {Button} from '@/components/ui/button';
import {APP_NAME} from '@/lib/brand';
import {INSTALL_DISMISSED_KEY, shouldOfferInstall} from '@/lib/pwa';

const STEPS = ['Tap Share', 'Choose Add to Home Screen', 'Tap Add'] as const;

/** Whether to offer the card can only be answered by the browser, and the answer never changes while
 * the page is open — so there is nothing to subscribe to. */
const nothingChanges = () => () => {};

function offerSnapshot(): boolean {
  let dismissed = false;
  try {
    dismissed = window.localStorage.getItem(INSTALL_DISMISSED_KEY) === 'true';
  } catch {
    // A private window refuses storage. Offering the card again is the harmless way to be wrong.
  }

  return shouldOfferInstall({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    installed: window.matchMedia('(display-mode: standalone)').matches,
    dismissed,
  });
}

/**
 * iOS gives a web app no install prompt of its own, so Arcoin has to ask — once.
 *
 * Shown only on iOS Safari, only when the app is not already installed, and only until it is dismissed.
 * The dismissal is the one thing here worth keeping in localStorage: it is a per-device convenience that
 * nobody else needs to see and nothing breaks if it is lost, which is exactly the case CLAUDE.md allows.
 */
export function InstallCard() {
  // The server has no idea what device this is, so it renders nothing and the browser decides.
  const offer = useSyncExternalStore(nothingChanges, offerSnapshot, () => false);
  const [dismissed, setDismissed] = useState(false);

  if (!offer || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
    } catch {
      // Nothing to do: the card simply offers itself again next time.
    }
  }

  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t bg-card p-4 shadow-lg md:mx-auto md:max-w-sm md:rounded-t-lg">
      <div className="flex items-center gap-2">
        <span aria-hidden className="size-2.5 rounded-[2px] bg-lime-500" />
        <p className="font-heading text-[16px] font-semibold">Add {APP_NAME} to your home screen</p>
      </div>

      <ol className="mt-3 flex flex-col gap-1.5">
        {STEPS.map((step, index) => (
          <li key={step} className="flex items-center gap-2 text-[13.5px]">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-navy-800 font-mono text-[11px] text-white">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <div className="mt-3 flex justify-end">
        <Button type="button" variant="ghost" className="h-11" onClick={dismiss}>
          Not now
        </Button>
      </div>
    </div>
  );
}
