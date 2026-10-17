import {redirect} from 'next/navigation';
import type {ReactNode} from 'react';
import {TopBar} from '@/app/(app)/top-bar';
import {getViewer} from '@/lib/me';

// Every working screen: signed in, on the team, under the top bar, on the light background.
export default async function AppLayout({children}: {children: ReactNode}) {
  const {me} = await getViewer();
  // The proxy already sent signed-out visitors away. This catches someone signed in who is no longer on the team.
  if (!me) redirect('/login');

  return (
    <>
      <TopBar name={me.name} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 md:px-6 md:py-6">{children}</main>
    </>
  );
}
