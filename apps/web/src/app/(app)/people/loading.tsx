import {Bar, LoadingShell} from '@/app/(app)/skeleton';

export default function Loading() {
  return (
    <LoadingShell measure="max-w-wide" what="the team">
      <div className="rounded-lg border bg-card p-4">
        <Bar className="h-3 w-full" />
        <div className="mt-4 flex flex-col gap-3.5">
          {Array.from({length: 7}, (_, person) => (
            <Bar key={person} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </LoadingShell>
  );
}
