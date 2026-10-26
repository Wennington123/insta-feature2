import { AppError } from '../errors.js';
import type { Post } from '../content/schema.js';
import { hasErrors, validatePost } from '../content/rules.js';
import { appendPublished, captionHash, isPublished, machineId, savePost, type PublishedRecord } from '../content/load.js';
import type { GraphClient } from '../graph/client.js';
import {
  createCarouselContainer,
  createContainer,
  getPermalink,
  publishContainer,
  waitForContainer,
  type ContainerInput,
} from '../graph/media.js';
import { checkPublicMedia, expectedKind } from '../media/check.js';
import { info, step, warn } from '../log.js';

export interface PublishStore {
  isPublished: (slug: string) => Promise<boolean>;
  append: (record: PublishedRecord) => Promise<void>;
  save: (post: Post) => Promise<void>;
}

export interface PublishOptions {
  yes?: boolean;
  dryRun?: boolean;
  noPublish?: boolean;
  force?: boolean;
  skipMediaCheck?: boolean;
  confirm?: (post: Post) => Promise<boolean>;
  wait?: { timeoutMs?: number; intervalMs?: number; sleep?: (ms: number) => Promise<void> };
  store?: PublishStore;
}

export type PublishStatus = 'published' | 'container-only' | 'dry-run' | 'cancelled';

export interface PublishOutcome {
  status: PublishStatus;
  containerId?: string;
  mediaId?: string;
  permalink?: string;
}

function isVideo(url: string): boolean {
  return /\.(mp4|mov|m4v)(\?.*)?$/i.test(url);
}

function truncate(text: string, size = 100): string {
  return text.length <= size ? text : `${text.slice(0, size)}...`;
}

function describeParams(params: Record<string, string | undefined>): string {
  return Object.entries(params)
    .filter((entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== '')
    .map(([key, value]) => `${key}=${key === 'caption' ? truncate(value, 80) : value}`)
    .join('\n    ');
}

function printDryRun(post: Post, client: GraphClient): void {
  const media = post.media ?? [];
  info(`dry-run: ${post.slug} (${post.type}) — nenhuma chamada sera feita`);

  if (post.type === 'carousel') {
    media.forEach((url, index) => {
      const plan = client.plan('POST', `/${client.userId}/media`, {
        image_url: isVideo(url) ? undefined : url,
        video_url: isVideo(url) ? url : undefined,
        media_type: isVideo(url) ? 'VIDEO' : undefined,
        is_carousel_item: 'true',
      });
      info(`\n  [${index + 1}/${media.length}] ${plan.method} ${plan.url}\n    ${plan.body ? describeParams(Object.fromEntries(new URLSearchParams(plan.body))) : ''}`);
    });
    const carousel = client.plan('POST', `/${client.userId}/media`, {
      media_type: 'CAROUSEL',
      children: media.map((_, index) => `<container-${index + 1}>`).join(','),
      caption: post.caption,
      is_ai_generated: post.is_ai_generated ? 'true' : undefined,
    });
    info(`\n  [carrossel] ${carousel.method} ${carousel.url}\n    ${describeParams(Object.fromEntries(new URLSearchParams(carousel.body ?? '')))}`);
  } else {
    const url = media[0] ?? '';
    const plan = client.plan('POST', `/${client.userId}/media`, {
      image_url: isVideo(url) ? undefined : url,
      video_url: isVideo(url) ? url : undefined,
      media_type: post.type === 'reels' ? 'REELS' : post.type === 'story' ? 'STORIES' : undefined,
      caption: post.type === 'story' ? undefined : post.caption,
      alt_text: post.type === 'image' ? post.alt_text : undefined,
      is_ai_generated: post.is_ai_generated ? 'true' : undefined,
    });
    info(`\n  [container] ${plan.method} ${plan.url}\n    ${describeParams(Object.fromEntries(new URLSearchParams(plan.body ?? '')))}`);
  }

  const publishPlan = client.plan('POST', `/${client.userId}/media_publish`, {
    creation_id: '<container-id>',
  });
  info(`\n  [publicar] ${publishPlan.method} ${publishPlan.url}`);
  info('\nCada container sera consultado ate status_code=FINISHED antes de publicar.');
}

async function preflightMedia(post: Post): Promise<void> {
  const media = post.media ?? [];
  const problems: string[] = [];

  for (const [index, url] of media.entries()) {
    step(`Verificando midia ${index + 1}/${media.length}...`);
    const check = await checkPublicMedia(url, { expect: expectedKind(url) });
    for (const warning of check.warnings) warn(`${url}: ${warning}`);
    if (!check.ok) {
      for (const problem of check.problems) problems.push(`media[${index}] ${url}: ${problem}`);
    }
  }

  if (problems.length > 0) {
    throw new AppError('Midia indisponivel para a Meta.', {
      hint: `${problems.join('\n')}\nCorrija as URLs e rode \`ig validate\` novamente.`,
    });
  }
}

async function buildContainer(client: GraphClient, post: Post, options: PublishOptions): Promise<string> {
  const media = post.media ?? [];
  const waitOptions = options.wait ?? {};

  if (post.type === 'carousel') {
    const children: string[] = [];
    for (const [index, url] of media.entries()) {
      step(`Criando container do slide ${index + 1}/${media.length}...`);
      const video = isVideo(url);
      const input: ContainerInput = {
        imageUrl: video ? undefined : url,
        videoUrl: video ? url : undefined,
        mediaType: video ? 'VIDEO' : undefined,
        isCarouselItem: true,
      };
      const childId = await createContainer(client, input);
      await waitForContainer(client, childId, waitOptions);
      children.push(childId);
    }
    step('Criando container do carrossel...');
    return createCarouselContainer(client, {
      children,
      caption: post.caption,
      isAiGenerated: post.is_ai_generated,
    });
  }

  const url = media[0] ?? '';
  const video = isVideo(url);
  const input: ContainerInput =
    post.type === 'image'
      ? { imageUrl: url, caption: post.caption, altText: post.alt_text, isAiGenerated: post.is_ai_generated }
      : post.type === 'reels'
        ? {
            videoUrl: video ? url : undefined,
            imageUrl: video ? undefined : url,
            caption: post.caption,
            mediaType: 'REELS',
            isAiGenerated: post.is_ai_generated,
          }
        : {
            videoUrl: video ? url : undefined,
            imageUrl: video ? undefined : url,
            mediaType: 'STORIES',
            isAiGenerated: post.is_ai_generated,
          };

  step('Criando container...');
  return createContainer(client, input);
}

export async function publishPost(
  post: Post,
  client: GraphClient,
  options: PublishOptions = {},
): Promise<PublishOutcome> {
  const issues = validatePost(post);
  const errors = issues.filter((issue) => issue.level === 'error');
  if (hasErrors(errors)) {
    throw new AppError(`Post "${post.slug}" invalido.`, {
      hint: errors.map((issue) => `${issue.field}: ${issue.message}`).join('\n'),
    });
  }
  for (const issue of issues.filter((item) => item.level === 'warn')) {
    warn(`${issue.field}: ${issue.message}`);
  }

  const store: PublishStore = options.store ?? {
    isPublished,
    append: appendPublished,
    save: savePost,
  };

  if (!options.force && (await store.isPublished(post.slug))) {
    throw new AppError(`Post "${post.slug}" ja foi publicado.`, {
      hint: 'Use --force apenas se quiser publicar de novo de proposito.',
    });
  }

  if (options.dryRun) {
    printDryRun(post, client);
    return { status: 'dry-run' };
  }

  if (!options.skipMediaCheck) {
    await preflightMedia(post);
  }

  if (!options.yes && !options.noPublish) {
    if (!options.confirm) {
      throw new AppError('Publicacao exige confirmacao explicita.', {
        hint: 'Rode com --yes ou use o fluxo interativo de `ig publish`.',
      });
    }
    const approved = await options.confirm(post);
    if (!approved) return { status: 'cancelled' };
  }

  const containerId = await buildContainer(client, post, options);
  step(`Container criado: ${containerId}`);

  await waitForContainer(client, containerId, options.wait ?? {});
  step('Container pronto (FINISHED).');

  if (options.noPublish) {
    info(`Nada foi publicado. Container ${containerId} valido por 24h.`);
    return { status: 'container-only', containerId };
  }

  const mediaId = await publishContainer(client, containerId);
  let permalink: string | undefined;
  try {
    permalink = await getPermalink(client, mediaId);
  } catch {
    permalink = undefined;
  }

  await store.append({
    slug: post.slug,
    mediaId,
    containerId,
    publishedAt: new Date().toISOString(),
    machine: machineId(),
    captionHash: captionHash(post.caption),
  });
  await store.save({ ...post, status: 'published' });

  return { status: 'published', containerId, mediaId, permalink };
}
