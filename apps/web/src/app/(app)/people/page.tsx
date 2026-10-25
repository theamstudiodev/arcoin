import {CapacityBar} from '@/app/(app)/people/capacity-bar';
import {PersonDialog} from '@/app/(app)/people/person-dialog';
import {Badge} from '@/components/ui/badge';
import {loadStudioForecast} from '@/lib/forecast';
import {formatCapacity} from '@/lib/format';
import {getViewer} from '@/lib/me';
import {PERSON_COLUMNS, type PersonRow} from '@/lib/people';
import {isAdmin, ROLE_LABELS} from '@/lib/roles';
import {createClient} from '@/lib/supabase/server';
import {hasWork, personWeekLoads, type WeekLoad, weekWindows} from '@/lib/workload';

// Phone: name over role, then the four weeks as one strip underneath. Desktop: one 44px row per person,
// with a column per week — the shape the spec asked for and the reason this screen used to end at 285px.
const COLUMNS =
  'md:grid md:min-h-11 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)_7rem_repeat(4,minmax(3.5rem,1fr))_6rem_2.75rem] ' +
  'md:items-center md:gap-4';
const LABEL = 'font-mono text-label font-medium text-muted-foreground uppercase';

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

  // The same forecast the Timeline and the clash list read, so this screen can never disagree with them
  // about how booked someone is.
  const studio = await loadStudioForecast();
  const windows = weekWindows(studio.today);
  const loads = personWeekLoads({
    today: studio.today,
    people: studio.people,
    tasks: studio.tasks,
    forecasts: studio.forecasts,
    capacity: studio.capacity,
  });

  return (
    <div className="mx-auto w-full max-w-wide">
      <div className="mb-5 flex items-center gap-3 md:mb-6">
        <div className="flex items-baseline gap-3">
          <h1 className="text-page font-semibold">People</h1>
          <p className="text-meta text-muted-foreground">
            {people.length} {people.length === 1 ? 'person' : 'people'}
          </p>
        </div>
        {canEdit && (
          <div className="ml-auto">
            <PersonDialog />
          </div>
        )}
      </div>

      {people.length === 0 ? (
        <div className="bg-blueprint rounded-lg border px-6 py-16 text-center">
          <p className="text-title font-semibold text-white">Nobody on the team yet</p>
          <p className="mt-1 text-body text-navy-100">Add the studio&apos;s architects and their time on production.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border bg-card">
            <div aria-hidden className={`hidden border-b px-4 py-2.5 ${COLUMNS} ${LABEL}`}>
              <span>Name</span>
              <span>Role</span>
              <span>Time on production</span>
              {windows.map((window) => (
                <span key={window.start}>{window.label}</span>
              ))}
              <span>Status</span>
            </div>
            <ul className="stagger divide-y">
              {people.map((person) => (
                <PersonItem
                  key={person.id}
                  person={person}
                  canEdit={canEdit}
                  weeks={loads.get(person.id) ?? []}
                  labels={windows.map((window) => window.label)}
                />
              ))}
            </ul>
          </div>

          <p className="mt-3 text-meta text-muted-foreground">
            Bars show booked hours per week against capacity. Red means fully booked.
          </p>
        </>
      )}
    </div>
  );
}

function PersonItem({
  person,
  canEdit,
  weeks,
  labels,
}: {
  person: PersonRow;
  canEdit: boolean;
  weeks: readonly WeekLoad[];
  labels: readonly string[];
}) {
  return (
    <li
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 md:py-1.5 ${COLUMNS} ${person.active ? '' : 'opacity-60'}`}
    >
      <span className="min-w-0 flex-1 truncate text-title font-semibold md:text-body md:font-medium">{person.name}</span>
      <span className="order-last w-full text-meta text-muted-foreground md:order-none md:w-auto md:text-body md:text-foreground">
        {ROLE_LABELS[person.role]}
      </span>
      <span className="font-mono text-meta tabular-nums">
        <span className="sr-only">Time on production: </span>
        {formatCapacity(person.capacity)}
      </span>

      {/* Phone: the four weeks as one strip under the name, each with its own heading, because four
          unlabelled bars in a row mean nothing. Desktop: one bar per column, headed by the table. */}
      <span className="order-last flex w-full gap-2 md:contents">
        {weeks.length === 0
          ? labels.map((label) => <span key={label} className="min-w-0 flex-1" />)
          : weeks.map((week, index) => (
              <span key={labels[index] ?? index} className="flex min-w-0 flex-1 flex-col gap-1 md:block">
                <span aria-hidden className={`${LABEL} md:hidden`}>
                  {labels[index]}
                </span>
                <CapacityBar load={week} />
              </span>
            ))}
      </span>

      {!hasWork(weeks) && person.active && (
        <span className="order-last w-full text-meta text-text-faint md:hidden">No work booked</span>
      )}

      {person.active ? (
        <Badge className="rounded-[10px] bg-lime-100 text-label text-navy-900">Active</Badge>
      ) : (
        <Badge variant="secondary" className="rounded-[10px] text-label text-muted-foreground">
          Inactive
        </Badge>
      )}
      {canEdit && <PersonDialog person={person} />}
    </li>
  );
}
