import { AppError } from '../errors.js';
import { loadEnv, readZernioConfig } from '../config.js';
import { loadPost } from '../content/load.js';
import { publishPost } from '../core/publish.js';
import { c, heading, ok, warn } from '../log.js';
import { publishViaZernio, ZernioClient } from '../providers/zernio.js';
import type { CommandContext } from './util.js';
import { confirmByTyping, createClient, flag, option, requirePositional } from './util.js';

function providerFrom(ctx: CommandContext): string {
  loadEnv();
  return option(ctx, 'via') ?? process.env.PUBLISH_PROVIDER ?? 'meta';
}

async function runZernio(ctx: CommandContext, slug: string): Promise<number> {
  const config = readZernioConfig();
  const accountId = option(ctx, 'account') ?? config.accountId;
  if (!accountId) {
    throw new AppError('ZERNIO_ACCOUNT_ID nao configurado.', {
      hint: 'Rode `ig zernio connect --write` ou defina ZERNIO_ACCOUNT_ID no .env.',
    });
  }

  const post = await loadPost(slug);
  const yes = flag(ctx, 'yes');
  const client = new ZernioClient({ apiKey: config.apiKey, baseUrl: config.baseUrl });

  heading(`Publicando ${slug} via Zernio`);
  const outcome = await publishViaZernio(post, {
    client,
    accountId,
    yes,
    dryRun: flag(ctx, 'dry-run'),
    draft: flag(ctx, 'no-publish'),
    force: flag(ctx, 'force'),
    skipMediaCheck: flag(ctx, 'skip-media-check'),
    confirm: yes ? undefined : confirmByTyping,
  });

  switch (outcome.status) {
    case 'published':
      ok(`Publicado! post_id=${outcome.postId}`);
      if (outcome.url) {
        console.log(`  ${c.cyan(outcome.url)}`);
      }
      break;
    case 'draft':
      ok(`Rascunho criado no Zernio: ${outcome.postId}`);
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

export async function run(ctx: CommandContext): Promise<number> {
  const slug = requirePositional(ctx, 1, 'o slug do post');
  const provider = providerFrom(ctx);

  if (provider === 'zernio') {
    return runZernio(ctx, slug);
  }
  if (provider !== 'meta') {
    throw new AppError(`Provedor desconhecido: ${provider}`, {
      hint: 'Use --via meta ou --via zernio, ou defina PUBLISH_PROVIDER no .env.',
    });
  }

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
