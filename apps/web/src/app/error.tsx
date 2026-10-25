'use client';

import {LoadError} from '@/components/load-error';

// Catches what the screens' own boundary can't: a failure in the (app) layout, e.g. looking up who is signed in.
export default function RootError({retry}: {error: unknown; retry: () => void}) {
  return <LoadError retry={retry} />;
}
