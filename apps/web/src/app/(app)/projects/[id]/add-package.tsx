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
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <NativeSelect
          aria-label="Package to add"
          value={code}
          disabled={pending}
          onChange={(event) => setCode(event.target.value as PackageCode)}
          className="w-56 [&>select]:h-8 [&>select]:text-base"
        >
          {codes.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {value} · {PACKAGE_NAMES[value]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button type="button" disabled={pending} onClick={add} className="h-8">
          <PlusIcon />
          {pending ? 'Adding…' : 'Add package'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
