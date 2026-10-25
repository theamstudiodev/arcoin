import {createCn} from 'cn/engine';
import tables from '@/lib/cn-tables';

/**
 * `cn` bound to this project's own Tailwind theme.
 *
 * The stock `cn` only knows Tailwind's default scales, so a custom size like `text-body` falls through
 * to its colour group — and merging `text-body` with `text-primary-foreground` silently dropped the
 * colour, which is how the register's Add button ended up navy text on navy. These tables are compiled
 * from globals.css, so every token in the studio's scale is classified correctly.
 *
 * Regenerate after adding a theme token: `npm run cn:build -w apps/web`.
 */
export const cn = createCn(tables);
