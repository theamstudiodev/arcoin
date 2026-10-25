import {BoardSummary} from '@/app/(app)/projects/board-summary';
import {type PhoneTier, PhoneBoard} from '@/app/(app)/projects/phone-board';
import {ProjectCard} from '@/app/(app)/projects/project-card';
import {type LeadChoice, ProjectDialog} from '@/app/(app)/projects/project-dialog';
import {Badge} from '@/components/ui/badge';
import {boardSummary, projectBoardMeta} from '@/lib/board';
import {loadStudioForecast} from '@/lib/forecast';
import {getViewer} from '@/lib/me';
import {
  byPriority,
  overBy,
  TIER_HINTS,
  TIER_LABELS,
  TIER_ORDER,
  tierCountLabel,
  tierLimit,
  type TierLimits,
} from '@/lib/project-rules';
import {PROJECT_COLUMNS} from '@/lib/projects';
import {isAdmin} from '@/lib/roles';
import {createClient} from '@/lib/supabase/server';

export default async function ProjectsPage() {
  const {me} = await getViewer();
  // Admins get the add, edit and move controls. The database refuses anyone else's changes either way.
  const canEdit = me !== null && isAdmin(me.role);

  const supabase = await createClient();
  // The full project row carries `client` and `project_type`, which the scheduler's narrower shape does
  // not — so the board reads both rather than widening what every other screen loads.
  const [projects, people, studio] = await Promise.all([
    supabase.from('projects').select(PROJECT_COLUMNS),
    supabase.from('people').select('id, name').order('sort_order').order('name'),
    loadStudioForecast(),
  ]);
  if (projects.error) throw new Error(`Couldn't load the projects: ${projects.error.message}`);
  if (people.error) throw new Error(`Couldn't load the team: ${people.error.message}`);

  const limits: TierLimits = {devLimit: studio.settings.dev_limit, readyLimit: studio.settings.ready_limit};
  const leadName = new Map(people.data.map((person) => [person.id, person.name]));
  const leads: readonly LeadChoice[] = people.data;
  const summary = boardSummary(studio);

  // Sorted and measured once. The phone list and the desktop columns are two readings of the same
  // four tiers, and working them out twice is how the two would eventually disagree.
  const tiers: readonly PhoneTier[] = TIER_ORDER.map((tier) => {
    const inTier = projects.data.filter((project) => project.tier === tier).sort(byPriority);
    return {
      tier,
      limit: tierLimit(tier, limits),
      over: overBy(tier, inTier.length, limits),
      rows: inTier.map((project) => ({
        project,
        meta: projectBoardMeta({
          project,
          packages: studio.packages,
          tasks: studio.tasks,
          forecasts: studio.forecasts,
          leadName: project.lead_id ? (leadName.get(project.lead_id) ?? null) : null,
        }),
      })),
    };
  });

  return (
    <div className="mx-auto w-full max-w-page">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-page font-semibold">Projects</h1>
          <p className="text-meta text-muted-foreground">
            {projects.data.length} {projects.data.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        {/* A phone gets the floating button at the bottom of the screen instead — one "Add project"
            control per width, so a thumb never has to reach the top of a fifty-row list. */}
        {canEdit && (
          <div className="ml-auto hidden md:block">
            <ProjectDialog leads={leads} />
          </div>
        )}
      </div>

      <BoardSummary summary={summary} />

      {projects.data.length === 0 ? (
        <div className="bg-blueprint animate-in fade-in zoom-in-95 duration-settle rounded-lg border px-6 py-16 text-center">
          <p className="text-title font-semibold text-white">No projects yet</p>
          <p className="mt-1 text-body text-navy-100">
            {canEdit
              ? 'Add the studio’s projects and sort them into tiers. Only Development is scheduled.'
              : 'Asif or Athiq will add the studio’s projects.'}
          </p>
        </div>
      ) : (
        <>
          <PhoneBoard tiers={tiers} />

          {/*
           * Desktop: four columns of equal height that scroll on their own, which is what the spec asks
           * for and what removes the dead space — Development holds fifteen cards and Dormant ten, so
           * left to grow naturally the board ended in a staircase with a quarter of the screen empty.
           * Four columns only from `xl`, because at 1024px each one would be 232px and every name truncates.
           */}
          <div className="hidden gap-4 md:grid md:grid-cols-2 xl:h-[calc(100dvh-14.5rem)] xl:grid-cols-4">
            {tiers.map(({tier, limit, over, rows}) => (
              <section key={tier} className="animate-rise-in flex min-w-0 flex-col gap-2 xl:min-h-0">
                <header className="flex flex-col gap-0.5">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-title font-semibold">{TIER_LABELS[tier]}</h2>
                    <span
                      aria-label={tierCountLabel(rows.length, limit)}
                      className={`font-mono text-meta tabular-nums ${over > 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}
                    >
                      {rows.length}
                      {limit !== null && ` / ${limit}`}
                    </span>
                    {over > 0 && (
                      <Badge className="rounded-[10px] bg-late-tint text-label text-destructive">{over} over</Badge>
                    )}
                  </div>
                  <p className="text-meta leading-snug text-muted-foreground">{TIER_HINTS[tier]}</p>
                </header>

                {rows.length === 0 ? (
                  <p className="rounded-lg border border-dashed px-3 py-6 text-center text-meta text-muted-foreground">
                    Nothing here
                  </p>
                ) : (
                  <ul className="stagger flex flex-col gap-2 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
                    {rows.map(({project, meta}) => (
                      <ProjectCard key={project.id} project={project} meta={meta} leads={leads} canEdit={canEdit} />
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </>
      )}

      {/* Outside the empty check: a studio with no projects is exactly when somebody needs to add one. */}
      {canEdit && <ProjectDialog leads={leads} trigger="fab" />}
    </div>
  );
}
