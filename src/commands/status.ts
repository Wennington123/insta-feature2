import { hasConfig, readConfigSafe } from '../config.js';
import { listPosts, readPublished } from '../content/load.js';
import { checkPublishingLimit } from '../graph/media.js';
import { GraphClient } from '../graph/client.js';
import { bullet, c, heading, info, warn } from '../log.js';
import type { CommandContext } from './util.js';
import { flag } from './util.js';

function statusLabel(status: string): string {
  if (status === 'published') return c.green(status.padEnd(9));
  if (status === 'scheduled') return c.cyan(status.padEnd(9));
  if (status === 'ready') return c.blue(status.padEnd(9));
  return c.dim(status.padEnd(9));
}

export async function run(ctx: CommandContext): Promise<number> {
  const posts = await listPosts();
  const published = await readPublished();
  const bySlug = new Map(published.map((record) => [record.slug, record]));
  const showAll = flag(ctx, 'all');

  heading('Posts');
  const visible = posts.filter((post) => showAll || post.status !== 'published');
  if (visible.length === 0) {
    info('  Nenhum post pendente. Use --all para ver o historico.');
  }
  for (const post of visible) {
    const record = bySlug.get(post.slug);
    let suffix = '';
    if (post.scheduled_for) {
      suffix = ` · ${new Date(post.scheduled_for).toLocaleString('pt-BR')}`;
    }
    if (record) {
      suffix += ` · publicado ${new Date(record.publishedAt).toLocaleString('pt-BR')} em ${record.machine}`;
    }
    console.log(`  ${statusLabel(post.status)} ${c.bold(post.slug)} ${c.dim(`(${post.type}, ${post.media?.length ?? 0} midia(s))`)}${c.dim(suffix)}`);
  }

  if (!flag(ctx, 'offline') && hasConfig()) {
    heading('Cota');
    const config = readConfigSafe();
    if (config) {
      try {
        const client = new GraphClient({
          token: config.accessToken,
          userId: config.userId,
          host: config.host,
          version: config.apiVersion,
        });
        const limit = await checkPublishingLimit(client);
        bullet('uso 24h', `${limit.quota_usage ?? 0}/${limit.config?.quota_total ?? '?'}`);
      } catch (err) {
        warn((err as Error).message);
      }
    }
  }

  return 0;
}
