import {redirect} from 'next/navigation';
import type {ReactNode} from 'react';
import {BottomNav} from '@/app/(app)/bottom-nav';
import {InstallCard} from '@/app/(app)/install-card';
import {OfflineStrip} from '@/app/(app)/offline-strip';
import {TopBar} from '@/app/(app)/top-bar';
import {getViewer} from '@/lib/me';
import {isAdmin} from '@/lib/roles';

// Every screen here is one person's view of the studio, so none of them may be built ahead of time. Without
// this, `next build` tries to prerender them and reads Supabase's keys from an environment that has none —
// which is how CI builds, with no .env.local.
export const dynamic = 'force-dynamic';

// Every working screen: signed in, on the team, under the top bar, on the light background.
export default async function AppLayout({children}: {children: ReactNode}) {
  const {me} = await getViewer();
  // The proxy already sent signed-out visitors away. This catches someone signed in who is no longer on the team.
  if (!me) redirect('/login');

  return (
    <>
      <TopBar name={me.name} isAdmin={isAdmin(me.role)} />
      <OfflineStrip />
      {/*
       * The outer bound only. Each screen sets the measure its own content wants — the register and the
       * timeline take the whole window, a clash message keeps a line short enough to track back from.
       * There used to be one 1024px cap here, which left 460px of empty grey beside every screen on a
       * laptop and squeezed the board's four columns to 232px.
       *
       * `pb-28` clears the phone's bottom bar; the desktop has none, so it drops back to ordinary padding.
       */}
      <main className="mx-auto w-full max-w-page flex-1 px-4 pt-4 pb-28 md:px-8 md:py-8">{children}</main>
      <BottomNav isAdmin={isAdmin(me.role)} />
      <InstallCard />
    </>
  );
}
