import {Bar, LoadingShell} from '@/app/(app)/skeleton';

export default function Loading() {
  return (
    <LoadingShell measure="max-w-none" what="twelve weeks of work">
      <div className="overflow-hidden rounded-lg border bg-card">
        <Bar className="m-3 h-3 w-full" />
        {Array.from({length: 9}, (_, row) => (
          <div key={row} className="flex items-center gap-3 border-t px-3 py-2.5">
            <Bar className="h-3.5 w-36 shrink-0" />
            {/* Bars of uneven length, because a programme with nine identical ones is not a programme. */}
            <Bar className="h-5" style={{width: `${18 + ((row * 37) % 55)}%`, marginLeft: `${(row * 23) % 30}%`}} />
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
