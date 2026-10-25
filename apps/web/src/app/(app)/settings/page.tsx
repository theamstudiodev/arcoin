import {CalendarCard} from '@/app/(app)/settings/calendar-card';
import {StudioRulesCard} from '@/app/(app)/settings/studio-rules-card';
import {getViewer} from '@/lib/me';
import {isAdmin} from '@/lib/roles';
import {HOLIDAY_COLUMNS, SETTINGS_COLUMNS, SETTINGS_DEFAULTS} from '@/lib/settings';
import {createClient} from '@/lib/supabase/server';

export default async function SettingsPage() {
  const {me} = await getViewer();
  // Admins get the controls. The database refuses everyone else's writes either way, so staff read the rules
  // rather than being given fields that cannot save.
  const canEdit = me !== null && isAdmin(me.role);

  const supabase = await createClient();
  const [settings, holidays] = await Promise.all([
    // One settings row per org, seeded with the limits the partners agreed.
    supabase.from('settings').select(SETTINGS_COLUMNS).maybeSingle(),
    supabase.from('holidays').select(HOLIDAY_COLUMNS).order('day'),
  ]);
  if (settings.error) throw new Error(`Couldn't load the studio rules: ${settings.error.message}`);
  if (holidays.error) throw new Error(`Couldn't load the holidays: ${holidays.error.message}`);

  const rules = settings.data ?? SETTINGS_DEFAULTS;

  return (
    <div className="mx-auto w-full max-w-form">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-page font-semibold">Settings</h1>
        <p className="text-meta text-muted-foreground">Every forecast in the studio is built from these.</p>
      </div>

      {/* Phone: the two cards stack. Desktop: side by side, and no wider than the partners can read across. */}
      <div className="grid items-start gap-4 md:grid-cols-2">
        <StudioRulesCard settings={rules} canEdit={canEdit} />
        <CalendarCard workdays={rules.workdays} holidays={holidays.data} canEdit={canEdit} />
      </div>
    </div>
  );
}
