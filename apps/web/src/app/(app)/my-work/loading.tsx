import {Bar, LoadingShell} from '@/app/(app)/skeleton';

export default function Loading() {
  return (
    <LoadingShell measure="max-w-form" what="your week">
      <div className="flex flex-col gap-4">
        {Array.from({length: 3}, (_, group) => (
          <div key={group} className="flex flex-col gap-2">
            <Bar className="h-3 w-28" />
            {Array.from({length: 3}, (_, task) => (
              <Bar key={task} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
