import {CardBlock, LoadingShell} from '@/app/(app)/skeleton';

export default function Loading() {
  return (
    <LoadingShell measure="max-w-form" what="what needs you today">
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({length: 4}, (_, card) => (
          <CardBlock key={card} rows={2} />
        ))}
      </div>
    </LoadingShell>
  );
}
