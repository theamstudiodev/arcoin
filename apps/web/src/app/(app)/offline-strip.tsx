'use client';

import {WifiOffIcon} from 'lucide-react';
import {usePathname, useRouter} from 'next/navigation';
import {useCallback, useEffect, useRef, useState} from 'react';
import {minutesBetween, offlineNotice} from '@/lib/pwa';

/*
 * While the phone has no network everything under the strip is however old the last load was, so it is
 * dimmed to say so — a screen of dates that looks live and is not is worse than no screen at all.
 *
 * The rule is written here rather than in globals.css because the strip does not own what it is dimming:
 * <main> belongs to the app layout, and this component is a line underneath the navy header.
 */
const DIM_STALE_CONTENT = 'body[data-offline] main{opacity:0.7;transition:opacity 150ms}';

// 12.5px per Stitch screen 13C. Amber-800 on the amber tint, not at-risk amber on it: at 12.5px the studio
// has to be able to read this line, and #F59E0B on #FFFBEB is 1.9:1.
const STRIP =
  'flex items-center justify-center gap-1.5 border-b border-at-risk/35 bg-at-risk-tint px-4 py-1.5 ' +
  'text-center text-[12.5px] leading-tight text-[#92400E] md:px-6';

/**
 * The amber strip: on screen only when the phone is offline, saying how old what is underneath is.
 *
 * Mount it in the app layout, directly under <TopBar />.
 */
export function OfflineStrip() {
  const router = useRouter();
  const pathname = usePathname();
  // When what is on screen was last drawn with a connection. A navigation that arrives is fresh by
  // definition, so it resets this.
  const drawnAt = useRef(Date.now());
  const [offline, setOffline] = useState(false);
  const [notice, setNotice] = useState(() => offlineNotice(0));

  const retell = useCallback(() => setNotice(offlineNotice(minutesBetween(drawnAt.current, Date.now()))), []);

  useEffect(() => {
    drawnAt.current = Date.now();
  }, [pathname]);

  useEffect(() => {
    function dropped() {
      setOffline(true);
      retell();
    }

    /*
     * The network is back, or Athiq has come back to the app. Pull the screen forward.
     *
     * This is where a retry belongs, not in a Background Sync handler: iOS does not implement Background
     * Sync, and iOS is what the studio carries. Phase 1 has nothing queued to replay — every mutation is a
     * server action that reports its own failure where it was pressed — so what is retried here is the read.
     * Phase 3's punch in and out, typed on a site visit with one bar of signal, queues into this handler.
     */
    function catchUp() {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      drawnAt.current = Date.now();
      setOffline(false);
      router.refresh();
    }

    if (!navigator.onLine) dropped();
    window.addEventListener('offline', dropped);
    window.addEventListener('online', catchUp);
    document.addEventListener('visibilitychange', catchUp);
    return () => {
      window.removeEventListener('offline', dropped);
      window.removeEventListener('online', catchUp);
      document.removeEventListener('visibilitychange', catchUp);
    };
  }, [retell, router]);

  useEffect(() => {
    if (!offline) return;
    document.body.setAttribute('data-offline', '');
    // Half a minute: the line reads in whole minutes, so this is as often as it can change.
    const tick = window.setInterval(retell, 30_000);
    return () => {
      window.clearInterval(tick);
      document.body.removeAttribute('data-offline');
    };
  }, [offline, retell]);

  if (!offline) return null;

  return (
    <>
      <style>{DIM_STALE_CONTENT}</style>
      <div role="status" aria-live="polite" data-slot="offline-strip" className={STRIP}>
        <WifiOffIcon aria-hidden className="size-3.5 shrink-0" />
        {notice}
      </div>
    </>
  );
}
