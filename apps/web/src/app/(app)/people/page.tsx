import {PersonDialog} from '@/app/(app)/people/person-dialog';
import {Badge} from '@/components/ui/badge';
import {formatCapacity} from '@/lib/format';
import {getViewer} from '@/lib/me';
import {PERSON_COLUMNS, type PersonRow} from '@/lib/people';
import {isAdmin, ROLE_LABELS} from '@/lib/roles';
import {createClient} from '@/lib/supabase/server';

// Phone: name over role, time on production and status at the right. Desktop: one 36px row per person, in columns.
const COLUMNS =
  'md:grid md:min-h-9 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_9rem_6rem_2.75rem] md:items-center md:gap-4';
const LABEL = 'font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase';

export default async function PeoplePage() {
  const {me} = await getViewer();
  // Admins get the add and edit controls. The database refuses anyone else's changes either way.
  const canEdit = me !== null && isAdmin(me.role);

  const supabase = await createClient();
  const {data: people, error} = await supabase
    .from('people')
    .select(PERSON_COLUMNS)
    .order('sort_order')
    .order('name');
  if (error) throw new Error(`Couldn't load the team: ${error.message}`);

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[26px] font-semibold">People</h1>
          <p className="text-[13px] text-muted-foreground">
            {people.length} {people.length === 1 ? 'person' : 'people'}
          </p>
        </div>
        {canEdit && (
          <div className="ml-auto">
            <PersonDialog />
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <div aria-hidden className={`hidden border-b px-4 py-2 ${COLUMNS} ${LABEL}`}>
          <span>Name</span>
          <span>Role</span>
          <span>Time on production</span>
          <span>Status</span>
        </div>
        <ul className="divide-y">
          {people.map((person) => (
            <PersonItem key={person.id} person={person} canEdit={canEdit} />
          ))}
        </ul>
      </div>
    </>
  );
}

function PersonItem({person, canEdit}: {person: PersonRow; canEdit: boolean}) {
  return (
    <li
      className={`flex flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-3 md:py-0.5 ${COLUMNS} ${person.active ? '' : 'opacity-60'}`}
    >
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold md:text-sm md:font-medium">{person.name}</span>
      <span className="order-last w-full text-[13px] text-muted-foreground md:order-none md:w-auto md:text-sm md:text-foreground">
        {ROLE_LABELS[person.role]}
      </span>
      <span className="font-mono text-[13px] tabular-nums">
        <span className="sr-only">Time on production: </span>
        {formatCapacity(person.capacity)}
      </span>
      {person.active ? (
        <Badge className="rounded-[10px] bg-lime-100 text-[11px] text-navy-900">Active</Badge>
      ) : (
        <Badge variant="secondary" className="rounded-[10px] text-[11px] text-muted-foreground">
          Inactive
        </Badge>
      )}
      {canEdit && <PersonDialog person={person} />}
    </li>
  );
}
