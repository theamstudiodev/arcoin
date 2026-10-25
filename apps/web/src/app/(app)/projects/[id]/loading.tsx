import {Bar, CardBlock, LoadingShell} from '@/app/(app)/skeleton';

export default function Loading() {
  return (
    <LoadingShell measure="max-w-page" what="the drawing register">
      <div className="mb-4 rounded-lg border bg-card p-4">
        <Bar className="h-7 w-64" />
        <Bar className="mt-3 h-4 w-full max-w-md" />
        <div className="mt-4 flex gap-6">
          {Array.from({length: 3}, (_, stat) => (
            <div key={stat} className="flex flex-col gap-1.5">
              <Bar className="h-6 w-16" />
              <Bar className="h-2.5 w-20" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <CardBlock rows={7} />
        <CardBlock rows={2} />
      </div>
    </LoadingShell>
  );
}
