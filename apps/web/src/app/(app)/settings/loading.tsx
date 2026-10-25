import {CardBlock, LoadingShell} from '@/app/(app)/skeleton';

export default function Loading() {
  return (
    <LoadingShell measure="max-w-form" what="the studio rules">
      <div className="grid gap-4 md:grid-cols-2">
        <CardBlock rows={6} />
        <CardBlock rows={4} />
      </div>
    </LoadingShell>
  );
}
