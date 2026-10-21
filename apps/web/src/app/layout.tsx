import type {Metadata, Viewport} from 'next';
import {IBM_Plex_Mono, Inter, Montserrat} from 'next/font/google';
import {APP_NAME} from '@/lib/brand';
import './globals.css';

// Montserrat for headings and the wordmark, Inter for the interface, IBM Plex Mono for codes and numbers.
const montserrat = Montserrat({subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-montserrat'});
const inter = Inter({subsets: ['latin'], variable: '--font-inter'});
const plexMono = IBM_Plex_Mono({subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex-mono'});

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'AM Studio — projects and capacity',
};

export const viewport: Viewport = {
  themeColor: '#0B2545',
  // The installed app draws under the notch and the home bar, so the phone's navy header and bottom nav
  // add the inset themselves with pt-safe / pb-safe. Pinch zoom is deliberately left alone — the 16px
  // rule on form fields is what stops iOS zooming in, not maximumScale.
  viewportFit: 'cover',
};

export default function RootLayout({children}: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
