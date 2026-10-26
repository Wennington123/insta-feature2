import { loadPost } from '../content/load.js';
import { publishPost } from '../core/publish.js';
import { c, heading, ok, warn } from '../log.js';
import type { CommandContext } from './util.js';
import { confirmByTyping, createClient, flag, requirePositional } from './util.js';

export async function run(ctx: CommandContext): Promise<number> {
  const slug = requirePositional(ctx, 1, 'o slug do post');
  const post = await loadPost(slug);
  const dryRun = flag(ctx, 'dry-run');
  const client = createClient({ allowPlaceholder: dryRun });
  const yes = flag(ctx, 'yes');

  heading(`Publicando ${slug}`);
  const outcome = await publishPost(post, client, {
    yes,
    dryRun,
    noPublish: flag(ctx, 'no-publish'),
    force: flag(ctx, 'force'),
    skipMediaCheck: flag(ctx, 'skip-media-check'),
    confirm: yes ? undefined : confirmByTyping,
  });

  switch (outcome.status) {
    case 'published':
      ok(`Publicado! media_id=${outcome.mediaId}`);
      if (outcome.permalink) {
        console.log(`  ${c.cyan(outcome.permalink)}`);
      }
      break;
    case 'container-only':
      ok(`Container validado sem publicar: ${outcome.containerId}`);
      break;
    case 'dry-run':
      ok('Dry-run concluido.');
      break;
    case 'cancelled':
      warn('Publicacao cancelada.');
      break;
  }

  return 0;
}
