'use client';

import {PlusIcon} from 'lucide-react';
import {useState, useTransition} from 'react';
import {Button} from '@/components/ui/button';
import {NativeSelect, NativeSelectOption} from '@/components/ui/native-select';
import {addPackage} from '@/lib/actions/packages';
import {type PackageCode, PACKAGE_NAMES} from '@/lib/package-rules';

/**
 * Adds a package to this project, from the codes it does not have yet. The studio delivers a project
 * over months, so a package appears when its work is planned — a project in concepts has no business
 * showing seven empty cards.
 */
export function AddPackage({projectId, codes}: {projectId: string; codes: readonly PackageCode[]}) {
  const [code, setCode] = useState<PackageCode | ''>(codes[0] ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add() {
    if (code === '') return;
    setError(null);
    startTransition(async () => {
      const result = await addPackage({project_id: projectId, code});
      if (!result.ok) setError(result.error);
    });
  }

  return (
    // Full width on a phone, where the select and the button are 385px side by side inside 358px of
    // room, and the whole screen scrolled sideways for it. Right-aligned from `md`, as before.
    <div className="flex w-full flex-col items-stretch gap-1 md:w-auto md:items-end">
      <div className="flex items-center gap-2">
        <NativeSelect
          aria-label="Package to add"
          value={code}
          disabled={pending}
          onChange={(event) => setCode(event.target.value as PackageCode)}
          className="min-w-0 flex-1 [&>select]:h-11 [&>select]:text-base md:w-56 md:flex-none md:[&>select]:h-8"
        >
          {codes.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {value} · {PACKAGE_NAMES[value]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button type="button" disabled={pending} onClick={add} className="h-11 shrink-0 md:h-8">
          <PlusIcon />
          {pending ? 'Adding…' : 'Add package'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-body text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
