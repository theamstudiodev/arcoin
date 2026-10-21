'use client';

import {useEffect} from 'react';

/**
 * Registers the service worker that caches the brand shell, so the installed app opens on Arcoin's own
 * screen rather than Safari's error page. What it does and does not cache is written at the top of
 * `public/sw.js` — in short, never an authenticated page.
 *
 * Registration is best-effort on purpose: if it fails, or the browser has no service workers at all, the
 * app must behave exactly as it did before. An install is a convenience, never a dependency.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  return null;
}
