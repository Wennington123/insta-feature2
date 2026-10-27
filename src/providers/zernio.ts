import { AppError } from '../errors.js';
import type { Post } from '../content/schema.js';
import { validatePost, type Issue } from '../content/rules.js';
import {
  appendPublished,
  captionHash,
  isPublished,
  machineId,
  savePost,
} from '../content/load.js';
import type { PublishStore } from '../core/publish.js';
import { preflightMedia } from '../core/publish.js';
import { info, ok, step, warn } from '../log.js';

export const ZERNIO_BASE_URL = 'https://zernio.com/api/v1';
export const ZERNIO_CAROUSEL_MAX = 10;

export interface ZernioAccount {
  _id: string;
  platform: string;
  username?: string;
  displayName?: string;
  name?: string;
}

export interface ZernioProfile {
  _id: string;
  name?: string;
}

export interface ZernioPlatformResult {
  platform: string;
  status: string;
  platformPostUrl?: string;
  error?: string;
}

export interface ZernioPost {
  _id: string;
  status: string;
  platforms?: ZernioPlatformResult[];
}

export interface ZernioMediaItem {
  type: 'image' | 'video';
  url: string;
  altText?: string;
}

export interface ZernioPlatformTarget {
  platform: 'instagram';
  accountId: string;
  platformSpecificData?: { contentType: 'story' };
}

export interface ZernioPostBody {
  content: string;
  mediaItems: ZernioMediaItem[];
  platforms: ZernioPlatformTarget[];
  publishNow?: boolean;
  isDraft?: boolean;
}

type FetchImpl = typeof fetch;

export interface ZernioClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: FetchImpl;
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|m4v)(\?.*)?$/i.test(url);
}

export class ZernioClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchImpl;

  constructor(options: ZernioClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? ZERNIO_BASE_URL).replace(/\/+$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = undefined;
    }

    if (!response.ok) {
      const record = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
      const message =
        typeof record.error === 'string'
          ? record.error
          : typeof record.message === 'string'
            ? record.message
            : text.slice(0, 300) || `HTTP ${response.status}`;
      const code = typeof record.code === 'string' ? record.code : undefined;
      throw new AppError(`Zernio: ${message}`, {
        hint: code ? `codigo: ${code}` : undefined,
      });
    }

    return parsed as T;
  }

  async listAccounts(): Promise<ZernioAccount[]> {
    const data = await this.request<{ accounts?: ZernioAccount[] }>('GET', '/accounts');
    return data.accounts ?? [];
  }

  async createProfile(name: string): Promise<ZernioProfile> {
    const data = await this.request<{ profile?: ZernioProfile }>('POST', '/profiles', { name });
    if (!data.profile?._id) {
      throw new AppError('Zernio nao retornou o perfil criado.');
    }
    return data.profile;
  }

  async getInstagramConnectUrl(profileId: string): Promise<string> {
    const query = new URLSearchParams({ profileId, loginMethod: 'instagram_login' });
    const data = await this.request<{ authUrl?: string; url?: string }>(
      'GET',
      `/connect/instagram?${query.toString()}`,
    );
    const url = data.authUrl ?? data.url;
    if (!url) {
      throw new AppError('Zernio nao retornou a URL de conexao do Instagram.');
    }
    return url;
  }

  async createPost(body: ZernioPostBody, idempotencyKey?: string): Promise<ZernioPost> {
    const headers: Record<string, string> = idempotencyKey
      ? { 'Idempotency-Key': idempotencyKey }
      : {};
    const data = await this.request<{ post?: ZernioPost }>('POST', '/posts', body, headers);
    if (!data.post?._id) {
      throw new AppError('Zernio nao retornou o post criado.');
    }
    return data.post;
  }

  async getPost(postId: string): Promise<ZernioPost> {
    const data = await this.request<{ post?: ZernioPost }>(
      'GET',
      `/posts/${encodeURIComponent(postId)}`,
    );
    if (!data.post?._id) {
      throw new AppError('Zernio nao retornou o post.');
    }
    return data.post;
  }
}

export function buildZernioPost(
  post: Post,
  options: { accountId: string; draft?: boolean },
): ZernioPostBody {
  const mediaItems: ZernioMediaItem[] = (post.media ?? []).map((url) => {
    const video = isVideoUrl(url);
    const item: ZernioMediaItem = { type: video ? 'video' : 'image', url };
    if (!video && post.alt_text) item.altText = post.alt_text;
    return item;
  });

  const target: ZernioPlatformTarget = {
    platform: 'instagram',
    accountId: options.accountId,
  };
  if (post.type === 'story') {
    target.platformSpecificData = { contentType: 'story' };
  }

  return {
    content: post.caption,
    mediaItems,
    platforms: [target],
    ...(options.draft ? { isDraft: true } : { publishNow: true }),
  };
}

export function validateZernioPost(post: Post): Issue[] {
  const issues = validatePost(post);
  const media = post.media ?? [];
  if (post.type === 'carousel' && media.length > ZERNIO_CAROUSEL_MAX) {
    issues.push({
      level: 'error',
      field: 'media',
      message: `O Zernio/Instagram aceita no maximo ${ZERNIO_CAROUSEL_MAX} itens por carrossel (encontrei ${media.length}).`,
    });
  }
  return issues;
}

export type ZernioPublishStatus = 'published' | 'draft' | 'dry-run' | 'cancelled';

export interface ZernioPublishOutcome {
  status: ZernioPublishStatus;
  postId?: string;
  url?: string;
}

export interface ZernioPublishOptions {
  client: ZernioClient;
  accountId: string;
  yes?: boolean;
  dryRun?: boolean;
  draft?: boolean;
  force?: boolean;
  skipMediaCheck?: boolean;
  confirm?: (post: Post) => Promise<boolean>;
  store?: PublishStore;
  wait?: { timeoutMs?: number; intervalMs?: number };
}

async function waitForPost(
  client: ZernioClient,
  postId: string,
  wait: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<ZernioPost> {
  const timeoutMs = wait.timeoutMs ?? 60_000;
  const intervalMs = wait.intervalMs ?? 2_000;
  const deadline = Date.now() + timeoutMs;
  let current = await client.getPost(postId);
  while (!['published', 'failed'].includes(current.status) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    current = await client.getPost(postId);
  }
  return current;
}

export async function publishViaZernio(
  post: Post,
  options: ZernioPublishOptions,
): Promise<ZernioPublishOutcome> {
  const issues = validateZernioPost(post);
  const errors = issues.filter((issue) => issue.level === 'error');
  if (errors.length > 0) {
    throw new AppError(`Post "${post.slug}" invalido para o Zernio.`, {
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

  const body = buildZernioPost(post, {
    accountId: options.accountId,
    draft: options.draft,
  });

  if (options.dryRun) {
    info(`dry-run: ${post.slug} (${post.type}) via Zernio — nenhuma chamada sera feita`);
    info(JSON.stringify({ method: 'POST', path: '/v1/posts', body }, null, 2));
    return { status: 'dry-run' };
  }

  if (!options.skipMediaCheck) {
    await preflightMedia(post);
  }

  if (!options.yes && !options.draft) {
    if (!options.confirm) {
      throw new AppError('Publicacao exige confirmacao explicita.', {
        hint: 'Rode com --yes ou use o fluxo interativo de `ig publish`.',
      });
    }
    if (!(await options.confirm(post))) {
      return { status: 'cancelled' };
    }
  }

  step(options.draft ? 'Salvando rascunho no Zernio...' : 'Publicando via Zernio...');
  const created = await options.client.createPost(
    body,
    `${post.slug}-${captionHash(post.caption)}`,
  );

  if (options.draft) {
    ok(`Rascunho criado no Zernio: ${created._id}`);
    return { status: 'draft', postId: created._id };
  }

  let final = created;
  if (!['published', 'failed'].includes(final.status)) {
    step('Aguardando o Zernio concluir a publicacao...');
    final = await waitForPost(options.client, final._id, options.wait);
  }

  const platform = final.platforms?.find((item) => item.platform === 'instagram') ?? final.platforms?.[0];
  if (final.status !== 'published' || platform?.status === 'failed') {
    throw new AppError(`O Zernio nao publicou: ${platform?.error ?? final.status}`, {
      hint: `Post ${final._id} no Zernio.`,
    });
  }

  const url = platform?.platformPostUrl;
  await store.append({
    slug: post.slug,
    mediaId: final._id,
    containerId: final._id,
    publishedAt: new Date().toISOString(),
    machine: machineId(),
    captionHash: captionHash(post.caption),
  });
  await store.save({ ...post, status: 'published' });

  return { status: 'published', postId: final._id, url };
}
