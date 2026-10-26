import { loadBrand } from '../brand.js';
import { loadPost } from '../content/load.js';
import { validatePost } from '../content/rules.js';
import { ok } from '../log.js';
import { openPath } from '../open.js';
import { writePreview } from '../preview.js';
import type { CommandContext } from './util.js';
import { flag, requirePositional } from './util.js';

export async function run(ctx: CommandContext): Promise<number> {
  const slug = requirePositional(ctx, 1, 'o slug do post');
  const post = await loadPost(slug);
  const brand = loadBrand();
  const issues = validatePost(post);

  const file = await writePreview(post, brand, issues);
  ok(`Preview: ${file}`);

  if (!flag(ctx, 'no-open')) openPath(file);
  return 0;
}
