import {Button} from '@/components/ui/button';

/**
 * What a screen shows when its data couldn't load: what happened, what to do, and the button that does it.
 * Rendered by the error boundaries, which are Client Components.
 */
export function LoadError({retry}: {retry: () => void}) {
  return (
    <div role="alert" className="mx-auto flex w-full max-w-sm flex-col items-start gap-3 px-4 py-10">
      <h2 className="text-lg font-semibold">Couldn&apos;t load this page</h2>
      <p className="text-sm text-muted-foreground">Check your connection, then try again.</p>
      <Button onClick={() => retry()} className="h-11 px-4">
        Try again
      </Button>
    </div>
  );
}
