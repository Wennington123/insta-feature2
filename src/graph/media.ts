import { AppError } from '../errors.js';
import { GraphClient } from './client.js';

export interface MeResponse {
  user_id?: string;
  id?: string;
  username?: string;
  account_type?: string;
  name?: string;
}

export interface ContainerInput {
  imageUrl?: string;
  videoUrl?: string;
  caption?: string;
  altText?: string;
  isCarouselItem?: boolean;
  isAiGenerated?: boolean;
  mediaType?: 'REELS' | 'STORIES' | 'VIDEO';
  trialParams?: string;
}

export interface ContainerStatus {
  status_code?: string;
  status?: string;
  id?: string;
}

export interface PublishingLimit {
  quota_usage?: number;
  config?: { quota_total?: number; quota_duration?: number };
}

export async function getMe(client: GraphClient): Promise<MeResponse> {
  return client.get<MeResponse>('/me', {
    fields: 'user_id,id,username,account_type,name',
  });
}

export async function checkPublishingLimit(client: GraphClient): Promise<PublishingLimit> {
  const response = await client.get<{ data?: PublishingLimit[] }>(
    `/${client.userId}/content_publishing_limit`,
    { fields: 'quota_usage,config' },
  );
  return response.data?.[0] ?? {};
}

export async function createContainer(
  client: GraphClient,
  input: ContainerInput,
): Promise<string> {
  if (!input.imageUrl && !input.videoUrl) {
    throw new AppError('Container sem midia: informe imageUrl ou videoUrl.');
  }

  const mediaType = input.videoUrl ? (input.mediaType ?? 'VIDEO') : input.mediaType;

  const response = await client.post<{ id?: string }>(`/${client.userId}/media`, {
    image_url: input.imageUrl,
    video_url: input.videoUrl,
    media_type: mediaType,
    caption: input.caption,
    alt_text: input.altText,
    is_carousel_item: input.isCarouselItem ? 'true' : undefined,
    is_ai_generated: input.isAiGenerated ? 'true' : undefined,
    trial_params: input.trialParams,
  });

  if (!response.id) throw new AppError('A Meta nao retornou o ID do container.');
  return response.id;
}

export async function createCarouselContainer(
  client: GraphClient,
  input: { children: string[]; caption: string; isAiGenerated?: boolean },
): Promise<string> {
  if (input.children.length === 0) throw new AppError('Carrossel sem filhos.');

  const response = await client.post<{ id?: string }>(`/${client.userId}/media`, {
    media_type: 'CAROUSEL',
    children: input.children.join(','),
    caption: input.caption,
    is_ai_generated: input.isAiGenerated ? 'true' : undefined,
  });

  if (!response.id) throw new AppError('A Meta nao retornou o ID do container do carrossel.');
  return response.id;
}

export async function getContainerStatus(
  client: GraphClient,
  containerId: string,
): Promise<ContainerStatus> {
  return client.get<ContainerStatus>(`/${containerId}`, { fields: 'status_code,status' });
}

export interface WaitOptions {
  timeoutMs?: number;
  intervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
  onPoll?: (status: ContainerStatus) => void;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function waitForContainer(
  client: GraphClient,
  containerId: string,
  options: WaitOptions = {},
): Promise<ContainerStatus> {
  const timeoutMs = options.timeoutMs ?? 300_000;
  const intervalMs = options.intervalMs ?? 5_000;
  const sleep = options.sleep ?? defaultSleep;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const status = await getContainerStatus(client, containerId);
    options.onPoll?.(status);
    const code = status.status_code;

    if (code === 'FINISHED' || code === 'PUBLISHED') return status;
    if (code === 'ERROR' || code === 'EXPIRED') {
      throw new AppError(
        `Container ${containerId} terminou com status ${code}${status.status ? `: ${status.status}` : '.'}`,
        {
          hint: 'Verifique formato, proporcao e se a URL da midia e publica.',
        },
      );
    }

    if (Date.now() >= deadline) {
      throw new AppError(
        `Tempo esgotado aguardando o container ${containerId} (ultimo status: ${code ?? 'desconhecido'}).`,
        { hint: 'Tente novamente; containers expiram em 24h.' },
      );
    }

    await sleep(intervalMs);
  }
}

export async function publishContainer(
  client: GraphClient,
  creationId: string,
): Promise<string> {
  const response = await client.post<{ id?: string }>(`/${client.userId}/media_publish`, {
    creation_id: creationId,
  });
  if (!response.id) throw new AppError('A Meta nao retornou o ID da midia publicada.');
  return response.id;
}

export async function getPermalink(client: GraphClient, mediaId: string): Promise<string | undefined> {
  const response = await client.get<{ permalink?: string }>(`/${mediaId}`, { fields: 'permalink' });
  return response.permalink;
}
