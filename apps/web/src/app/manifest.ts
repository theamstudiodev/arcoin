import type {MetadataRoute} from 'next';
import {APP_NAME} from '@/lib/brand';

/**
 * What iOS and Android read when Athiq adds Arcoin to his home screen.
 *
 * Next serves this at /manifest.webmanifest and puts the <link rel="manifest"> in every page's head itself,
 * so nothing in layout.tsx has to name it. Push notifications are phase 2, but the install happens once:
 * shipping the manifest and the service worker now means switching push on later costs the studio nothing.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    // The app's identity to the browser. Pinned so a later change of start_url re-points the installed app
    // rather than counting as a second app the studio has to install again.
    id: '/',
    name: `${APP_NAME} — AM Studio`,
    short_name: APP_NAME,
    description: 'AM Studio — projects and capacity',
    // Not /projects: the root redirects to whichever screen is home, and the installed app should follow it.
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // The splash Android paints while the app opens: the blueprint's navy, the same as the login screen.
    background_color: '#081C33',
    // navy-800, matching viewport.themeColor in layout.tsx. The phone's status bar takes this colour.
    theme_color: '#0B2545',
    icons: [
      {src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any'},
      {src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
      // Android crops a launcher icon to its own shape; this one keeps the mark inside the safe circle.
      {src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
    ],
  };
}
