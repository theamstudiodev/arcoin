/*
 * Arcoin's service worker. Hand written, forty lines, no build step — the install has to keep working for
 * years with one developer, and a plugin that rewrites this file on every build is a thing to fight.
 *
 * WHAT IT CACHES, AND WHY SO LITTLE
 *
 * Every screen in Arcoin is one person's view of the studio and is rendered fresh on every request. Cache
 * an HTML response here and the next person to open the phone — or the same person after Asif changes a
 * priority — reads somebody else's screen, or yesterday's. So:
 *
 *   - navigations        network only, with /offline.html if the network is gone. Never stored.
 *   - the brand shell    the icons, the fonts under /_next/static/media and the offline page: cache first.
 *                        These are content addressed or fixed, carry nobody's data, and are what makes the
 *                        installed app open instantly on the site's own screen rather than Safari's error.
 *   - everything else    untouched. Supabase is on another origin and is never intercepted; route handlers,
 *                        server actions, the manifest and the React payloads go straight to the network.
 *
 * NO BACKGROUND SYNC. iOS does not implement it, and the studio runs on iPhones, so a `sync` listener here
 * would be a promise the phone never keeps. Retrying is the page's job instead, on visibilitychange — see
 * app/(app)/offline-strip.tsx.
 *
 * Push notifications are phase 2. This worker ships now so the install is done once: adding a `push`
 * listener later reaches the phones already carrying it, with nobody re-installing anything.
 */

const SHELL = 'arcoin-shell-v1';

// Fixed files, no session in any of them.
const SHELL_FILES = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png', '/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(fillShell());
  self.skipWaiting();
});

async function fillShell() {
  const cache = await caches.open(SHELL);
  await Promise.all(
    SHELL_FILES.map(async (path) => {
      try {
        const response = await fetch(path, {cache: 'reload', credentials: 'same-origin'});
        // A signed-out request is answered with a redirect to /login. Store that and the offline screen
        // becomes a stale login page, so a redirect is dropped rather than cached.
        if (response.ok && !response.redirected) await cache.put(path, response);
      } catch {
        // No network while installing: the worker still activates, and the next visit fills what is missing.
      }
    }),
  );
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // One cache, one name. A rename above is how the shell is replaced.
      for (const name of await caches.keys()) if (name !== SHELL) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(network(request));
    return;
  }

  if (SHELL_FILES.includes(url.pathname) || url.pathname.startsWith('/_next/static/media/')) {
    event.respondWith(shellFirst(request));
  }
});

/** The page as the server renders it, or the offline screen. Nothing on this path is ever stored. */
async function network(request) {
  try {
    return await fetch(request);
  } catch {
    const offline = await caches.match('/offline.html');
    return offline ?? new Response('Arcoin is offline.', {status: 503, headers: {'content-type': 'text/plain'}});
  }
}

/** Fixed assets: whatever is in the shell, otherwise the network, and keep what comes back. */
async function shellFirst(request) {
  const cached = await caches.match(request, {ignoreSearch: false});
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && !response.redirected && response.type === 'basic') {
    const cache = await caches.open(SHELL);
    await cache.put(request, response.clone());
  }
  return response;
}
