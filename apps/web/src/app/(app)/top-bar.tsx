import {TopNav} from '@/app/(app)/top-nav';
import {Button} from '@/components/ui/button';
import {signOut} from '@/lib/actions/auth';
import {APP_NAME} from '@/lib/brand';

/**
 * The navy bar on every working screen: the wordmark, the screens, who is signed in, and Sign out.
 *
 * `pt-safe` matters here and nowhere else: the installed app draws edge to edge, so without it this bar
 * sits under the notch on every screen but Today, which was adding the inset itself.
 */
export function TopBar({name, isAdmin}: {name: string; isAdmin: boolean}) {
  return (
    <header className="pt-safe bg-navy-800 text-white [--ring:#A3E635]">
      <div className="mx-auto flex h-14 w-full max-w-page items-center gap-4 px-4 md:h-16 md:px-8">
        <span className="flex items-center gap-2 font-heading text-section leading-none font-extrabold tracking-tight">
          <span aria-hidden className="size-2.5 rounded-[2px] bg-lime-500" />
          {APP_NAME}
        </span>
        <TopNav isAdmin={isAdmin} />
        <span className="ml-auto min-w-0 truncate text-meta text-white/80 max-sm:sr-only">{name}</span>
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            className="h-11 px-3 text-meta text-white hover:bg-white/10 hover:text-white md:h-10"
          >
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
