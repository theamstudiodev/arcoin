import {ProjectCard} from '@/app/(app)/projects/project-card';
import {type LeadChoice, ProjectDialog} from '@/app/(app)/projects/project-dialog';
import {Badge} from '@/components/ui/badge';
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
  const [projects, people, settings] = await Promise.all([
    supabase.from('projects').select(PROJECT_COLUMNS),
    supabase.from('people').select('id, name').order('sort_order').order('name'),
    supabase.from('settings').select('dev_limit, ready_limit').maybeSingle(),
  ]);
  if (projects.error) throw new Error(`Couldn't load the projects: ${projects.error.message}`);
  if (people.error) throw new Error(`Couldn't load the team: ${people.error.message}`);
  if (settings.error) throw new Error(`Couldn't load the studio limits: ${settings.error.message}`);

  // One settings row per org, seeded with the limits the partners agreed. Fall back to them if it is missing.
  const limits: TierLimits = {devLimit: settings.data?.dev_limit ?? 15, readyLimit: settings.data?.ready_limit ?? 10};
  const leadName = new Map(people.data.map((person) => [person.id, person.name]));
  const leads: readonly LeadChoice[] = people.data;

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[26px] font-semibold">Projects</h1>
          <p className="text-[13px] text-muted-foreground">
            {projects.data.length} {projects.data.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        {canEdit && (
          <div className="ml-auto">
            <ProjectDialog leads={leads} />
          </div>
        )}
      </div>

      {projects.data.length === 0 ? (
        <div className="bg-blueprint rounded-lg border px-6 py-16 text-center">
          <p className="text-[15px] font-semibold">No projects yet</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {canEdit
              ? 'Add the studio’s projects and sort them into tiers. Only Development is scheduled.'
              : 'Asif or Athiq will add the studio’s projects.'}
          </p>
        </div>
      ) : (
        // Phone: the four tiers stack and scroll. Desktop: columns, which is how the partners read the board.
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {TIER_ORDER.map((tier) => {
            const inTier = projects.data.filter((project) => project.tier === tier).sort(byPriority);
            const limit = tierLimit(tier, limits);
            const over = overBy(tier, inTier.length, limits);

            return (
              <section key={tier} className="flex min-w-0 flex-col gap-2">
                <header className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-[15px] font-semibold">{TIER_LABELS[tier]}</h2>
                    <span
                      aria-label={tierCountLabel(inTier.length, limit)}
                      className={`font-mono text-[12px] tabular-nums ${over > 0 ? 'font-semibold text-red-700' : 'text-muted-foreground'}`}
                    >
                      {inTier.length}
                      {limit !== null && ` / ${limit}`}
                    </span>
                    {over > 0 && (
                      <Badge className="rounded-[10px] bg-red-100 text-[11px] text-red-800">
                        {over} over
                      </Badge>
                    )}
                  </div>
                  <p className="text-[12px] leading-snug text-muted-foreground">{TIER_HINTS[tier]}</p>
                </header>

                {inTier.length === 0 ? (
                  <p className="rounded-lg border border-dashed px-3 py-6 text-center text-[13px] text-muted-foreground">
                    Nothing here
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {inTier.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        leadName={project.lead_id ? (leadName.get(project.lead_id) ?? null) : null}
                        leads={leads}
                        canEdit={canEdit}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
