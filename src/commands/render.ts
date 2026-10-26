import { loadBrand } from '../brand.js';
import { readConfigSafe } from '../config.js';
import { loadPost, savePost } from '../content/load.js';
import { heading, info, ok, warn } from '../log.js';
import { resolveMediaUrl } from '../media/github-url.js';
import { renderPost } from '../media/render.js';
import type { CommandContext } from './util.js';
import { requirePositional } from './util.js';

export async function run(ctx: CommandContext): Promise<number> {
  const slug = requirePositional(ctx, 1, 'o slug do post');
  const post = await loadPost(slug);
  const brand = loadBrand();

  heading(`Renderizando ${slug}`);
  const result = await renderPost(post, brand);
  for (const warning of result.warnings) warn(warning);

  const config = readConfigSafe();
  const urls: string[] = [];
  for (const file of result.files) {
    ok(file);
    const url = resolveMediaUrl(file, config?.mediaBaseUrl);
    if (url) {
      urls.push(url);
      info(`     ${url}`);
    } else {
      warn('Nao foi possivel montar a URL publica (sem origin do GitHub nem IG_MEDIA_BASE_URL).');
    }
  }

  if (urls.length === result.files.length) {
    const next = {
      ...post,
      media: urls,
      status: post.status === 'published' ? post.status : post.scheduled_for ? 'scheduled' : 'ready',
    } as typeof post;
    await savePost(next);
    ok(`Post atualizado com ${urls.length} midia(s).`);
  } else {
    warn('Post nao foi atualizado com as URLs; configure IG_MEDIA_BASE_URL ou o remote do GitHub.');
  }

  return 0;
}
