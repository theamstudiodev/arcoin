import {Bar, LoadingShell} from '@/app/(app)/skeleton';

export default function Loading() {
  return (
    <LoadingShell measure="max-w-page" what="the portfolio board">
      {/* The summary strip, then four tier columns — two abreast on a tablet, one on a phone. */}
      <div className="mb-5 flex flex-wrap gap-5">
        <Bar className="h-5 w-44" />
        <Bar className="h-5 w-36" />
        <Bar className="h-5 w-20" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({length: 4}, (_, column) => (
          <div key={column} className="flex flex-col gap-2">
            <Bar className="h-4 w-32" />
            <Bar className="h-3 w-full" />
            {Array.from({length: 5}, (_, card) => (
              <Bar key={card} className="h-[5.5rem] w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
