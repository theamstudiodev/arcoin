'use client';

import {LoadError} from '@/components/load-error';

// A screen that fails keeps the top bar, so Sign out still works.
export default function ScreenError({retry}: {error: unknown; retry: () => void}) {
  return <LoadError retry={retry} />;
}
