/**
 * Project identity colours for the timeline and the mobile list.
 *
 * Eight hues that avoid red and amber — reserved for lateness — and avoid green, because lime is the
 * only green in the system. So a bar's colour can never be mistaken for a state. Each one carries a
 * white 11px label at the 90% opacity the timeline draws bars with; the weakest is 5.3:1.
 *
 * Colour is never the only cue: a bar carries its project code and the legend repeats it, so the
 * timeline still reads for someone who cannot separate these hues.
 *
 * Written out as whole class names because Tailwind only emits a utility it can see in the source —
 * `bg-project-${n}` composed at runtime would produce no CSS at all.
 */
export const PROJECT_BAR_CLASSES = [
  'bg-project-1',
  'bg-project-2',
  'bg-project-3',
  'bg-project-4',
  'bg-project-5',
  'bg-project-6',
  'bg-project-7',
  'bg-project-8',
] as const;

export type ProjectBarClass = (typeof PROJECT_BAR_CLASSES)[number];

/**
 * The same project gets the same colour on every screen and every load, derived from its code rather
 * than stored — there is no colour column, and one more column for decoration is not worth a migration.
 */
export function projectColourClass(key: string): ProjectBarClass {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) % 2147483647;
  }
  return PROJECT_BAR_CLASSES[hash % PROJECT_BAR_CLASSES.length] as ProjectBarClass;
}
