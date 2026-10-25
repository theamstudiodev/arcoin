import {Bar, LoadingShell} from '@/app/(app)/skeleton';

export default function Loading() {
  return (
    <LoadingShell measure="max-w-reading" what="the clash list">
      <div className="flex flex-col gap-2.5">
        {Array.from({length: 5}, (_, clash) => (
          <Bar key={clash} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </LoadingShell>
  );
}
