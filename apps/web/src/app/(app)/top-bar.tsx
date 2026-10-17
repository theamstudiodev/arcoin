import {Button} from '@/components/ui/button';
import {signOut} from '@/lib/actions/auth';
import {APP_NAME} from '@/lib/brand';

/** The navy bar on every working screen: the wordmark, who is signed in, and Sign out for this device. */
export function TopBar({name}: {name: string}) {
  return (
    <header className="bg-navy-800 text-white [--ring:#A3E635]">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4 md:px-6">
        <span className="flex items-center gap-2 font-heading text-lg leading-none font-extrabold tracking-tight">
          <span aria-hidden className="size-2.5 rounded-[2px] bg-lime-500" />
          {APP_NAME}
        </span>
        <span className="ml-auto min-w-0 truncate text-sm text-white/80">{name}</span>
        <form action={signOut}>
          <Button type="submit" variant="ghost" className="h-11 px-3 text-white hover:bg-white/10 hover:text-white">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
