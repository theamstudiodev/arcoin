import {notFound} from 'next/navigation';
import {CountUp} from '@/app/(app)/count-up';
import {HeaderFields} from '@/app/(app)/projects/[id]/header-fields';
import {AddPackage} from '@/app/(app)/projects/[id]/add-package';
import {PackageCard} from '@/app/(app)/projects/[id]/package-card';
import {PackageSummary} from '@/app/(app)/projects/[id]/package-summary';
import {ProjectDialog} from '@/app/(app)/projects/project-dialog';
import {Badge} from '@/components/ui/badge';
import {loadStudioForecast} from '@/lib/forecast';
import {formatShortDate} from '@/lib/format';
import {getViewer} from '@/lib/me';
import {byPackageOrder} from '@/lib/package-rules';
import {packageCodesNotOn} from '@/lib/packages';
import {TIER_LABELS} from '@/lib/project-rules';
import {PROJECT_COLUMNS} from '@/lib/projects';
import {isAdmin} from '@/lib/roles';
import {createClient} from '@/lib/supabase/server';
import {
  type AssigneeChoice,
  byTaskOrder,
  finishesOn,
  lateCount,
  type RegisterRow,
  remainingHours,
} from '@/lib/tasks';

const STAT = 'flex flex-col';
const STAT_LABEL = 'font-mono text-label font-medium text-muted-foreground uppercase';

export default async function ProjectPage({params}: PageProps<'/projects/[id]'>) {
  const {id} = await params;
  const {me} = await getViewer();

  const supabase = await createClient();
  // The scheduling loader carries only what the engine needs. The header edits the client and the
  // project type too, so the full row is read here rather than widening every screen's query.
  const [full, studio] = await Promise.all([
    supabase.from('projects').select(PROJECT_COLUMNS).eq('id', id).maybeSingle(),
    loadStudioForecast(),
  ]);
  if (full.error) throw new Error(`Couldn't load the project: ${full.error.message}`);
  if (!full.data) notFound();

  const project = full.data;
  // Two different permissions, and the database draws the line between them. An admin or the
  // project's own lead may change its work — its packages and its drawings. Only an admin may
  // change the project row itself: its tier, its priority, who leads it. The lead used to be
  // offered the edit dialog and then refused by the database on save.
  const canEdit = me !== null && (isAdmin(me.role) || project.lead_id === me.id);
  const canEditProject = me !== null && isAdmin(me.role);

  const packages = studio.packages.filter((pkg) => pkg.project_id === id).sort(byPackageOrder);
  const rowsFor = (packageId: string): readonly RegisterRow[] =>
    studio.tasks
      .filter((task) => task.package_id === packageId)
      .sort(byTaskOrder)
      .map((task) => ({task, forecast: studio.forecasts.get(task.id) ?? null}));

  const everyRow = packages.flatMap((pkg) => rowsFor(pkg.id));
  const people: readonly AssigneeChoice[] = studio.people.map((person) => ({
    id: person.id,
    name: person.name,
    active: person.active,
  }));
  const leads = studio.people.map((person) => ({id: person.id, name: person.name}));
  const scheduled = project.tier === 'development';
  const late = lateCount(everyRow);
  const finish = finishesOn(everyRow);

  return (
    <div className="mx-auto w-full max-w-page">
      <div className="mb-4 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h1 className="text-page leading-tight font-semibold">{project.name}</h1>
              {project.code && <span className="font-mono text-meta text-muted-foreground">{project.code}</span>}
            </div>
            {/* An admin gets these as fields below, so the line says only what the fields do not: on a
                phone, where Tier and Priority are the two pills and the rest is read, not typed. */}
            {canEditProject ? (
              <p className="mt-1 text-body text-muted-foreground md:hidden">
                {[
                  project.client,
                  project.project_type,
                  project.target_date ? `Target ${formatShortDate(project.target_date)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : (
              <p className="mt-1 text-body text-muted-foreground">
                {[
                  project.client,
                  project.project_type,
                  TIER_LABELS[project.tier],
                  project.priority === null ? 'Unranked' : `Priority ${project.priority}`,
                  project.target_date ? `Target ${formatShortDate(project.target_date)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </div>

          <div className="flex items-start gap-5">
            <div className={STAT}>
              <span className="font-heading text-section font-semibold">
                {finish ? formatShortDate(finish) : '—'}
              </span>
              <span className={STAT_LABEL}>Forecast finish</span>
            </div>
            <div className={STAT}>
              <span className={`font-heading text-section font-semibold ${late > 0 ? 'text-destructive' : ''}`}>
                <CountUp value={late} />
              </span>
              <span className={STAT_LABEL}>Late</span>
            </div>
            <div className={STAT}>
              <span className="font-heading text-section font-semibold">
                <CountUp value={remainingHours(everyRow.map((row) => row.task))} as="hours" />
              </span>
              <span className={STAT_LABEL}>Hours left</span>
            </div>
            {canEditProject && <ProjectDialog project={project} leads={leads} />}
          </div>
        </div>

        {canEditProject && <HeaderFields project={project} leads={leads} />}

        {!scheduled && (
          <p className="mt-3 text-meta text-muted-foreground">
            Only Development projects are scheduled, so this one has no forecast dates yet.
          </p>
        )}
      </div>

      {packages.length === 0 ? (
        <div className="bg-blueprint rounded-lg border px-6 py-16 text-center">
          <p className="text-title font-semibold text-white">No packages yet</p>
          <p className="mt-1 text-body text-navy-100">
            {canEdit
              ? 'Add the first package, then the drawings that go in it.'
              : 'The Project Architect will break this project into packages.'}
          </p>
          {canEdit && (
            <div className="mt-4 flex justify-center">
              <AddPackage projectId={id} codes={packageCodesNotOn(packages)} />
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {packages.map((pkg, index) => (
            <div key={pkg.id}>
              {/* The register is a dense editable table and the scope calls it unusable at 390px, so a
                  phone gets the same work read-only. Someone who cannot edit gets that view at any size. */}
              {canEdit ? (
                <>
                  <div className="md:hidden">
                    <PackageSummary pkg={pkg} rows={rowsFor(pkg.id)} people={people} defaultOpen={index === 0} />
                  </div>
                  <div className="hidden md:block">
                    <PackageCard pkg={pkg} rows={rowsFor(pkg.id)} people={people} scheduled={scheduled} />
                  </div>
                </>
              ) : (
                <PackageSummary pkg={pkg} rows={rowsFor(pkg.id)} people={people} defaultOpen={index === 0} />
              )}
            </div>
          ))}

          {/* The row wraps: at 390px the package select, the button and the note lay out 632px wide
              in one line, and the whole document scrolled sideways because of it. */}
          {canEdit && (
            <div className="flex flex-wrap items-center gap-3">
              <AddPackage projectId={id} codes={packageCodesNotOn(packages)} />
              <Badge variant="secondary" className="rounded-[10px] text-label text-muted-foreground md:hidden">
                Open the full register on desktop
              </Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
