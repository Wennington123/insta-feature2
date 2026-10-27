import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ZernioClient,
  buildZernioPost,
  publishViaZernio,
  validateZernioPost,
} from '../src/providers/zernio.js';
import type { Post } from '../src/content/schema.js';
import type { PublishedRecord } from '../src/content/load.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function post(overrides: Partial<Post> = {}): Post {
  return {
    slug: 'post-teste',
    type: 'image',
    status: 'ready',
    caption: 'Legenda de teste',
    alt_text: 'descricao',
    media: ['https://example.com/foto.jpg'],
    ...overrides,
  };
}

test('monta payload de imagem com alt text', () => {
  const body = buildZernioPost(post(), { accountId: 'acc-1' });

  assert.equal(body.content, 'Legenda de teste');
  assert.equal(body.publishNow, true);
  assert.deepEqual(body.mediaItems, [
    { type: 'image', url: 'https://example.com/foto.jpg', altText: 'descricao' },
  ]);
  assert.deepEqual(body.platforms, [{ platform: 'instagram', accountId: 'acc-1' }]);
});

test('carrossel envia todos os itens na ordem', () => {
  const media = Array.from({ length: 9 }, (_, index) => `https://example.com/${index + 1}.jpg`);
  const body = buildZernioPost(post({ type: 'carousel', media }), { accountId: 'acc-1' });

  assert.equal(body.mediaItems.length, 9);
  assert.equal(body.mediaItems[0]?.url, 'https://example.com/1.jpg');
  assert.equal(body.mediaItems[8]?.url, 'https://example.com/9.jpg');
});

test('story usa contentType story', () => {
  const body = buildZernioPost(post({ type: 'story' }), { accountId: 'acc-1' });

  assert.deepEqual(body.platforms, [
    {
      platform: 'instagram',
      accountId: 'acc-1',
      platformSpecificData: { contentType: 'story' },
    },
  ]);
});

test('reel envia video e nao aplica alt text', () => {
  const body = buildZernioPost(
    post({ type: 'reels', media: ['https://example.com/clip.mp4'] }),
    { accountId: 'acc-1' },
  );

  assert.deepEqual(body.mediaItems, [{ type: 'video', url: 'https://example.com/clip.mp4' }]);
});

test('carrossel acima de 10 itens e erro no Zernio', () => {
  const media = Array.from({ length: 11 }, (_, index) => `https://example.com/${index + 1}.jpg`);
  const issues = validateZernioPost(post({ type: 'carousel', media }));

  assert.ok(
    issues.some((issue) => issue.level === 'error' && issue.field === 'media'),
  );
});

test('client envia Bearer e Idempotency-Key', async () => {
  let captured: { url: string; init?: RequestInit } | undefined;
  const client = new ZernioClient({
    apiKey: 'sk_test',
    fetchImpl: (async (input: string | URL | Request, init?: RequestInit) => {
      captured = { url: String(input), init };
      return jsonResponse(
        {
          post: {
            _id: 'post-1',
            status: 'published',
            platforms: [
              { platform: 'instagram', status: 'published', platformPostUrl: 'https://instagram.com/p/x' },
            ],
          },
        },
        201,
      );
    }) as typeof fetch,
  });

  const created = await client.createPost(
    buildZernioPost(post(), { accountId: 'acc-1' }),
    'idem-1',
  );

  assert.equal(created._id, 'post-1');
  assert.equal(captured?.url, 'https://zernio.com/api/v1/posts');
  assert.equal(captured?.init?.method, 'POST');

  const headers = new Headers(captured?.init?.headers ?? {});
  assert.equal(headers.get('authorization'), 'Bearer sk_test');
  assert.equal(headers.get('idempotency-key'), 'idem-1');

  const body = JSON.parse(String(captured?.init?.body)) as Record<string, unknown>;
  assert.equal(body.publishNow, true);
});

test('erro do Zernio vira AppError', async () => {
  const client = new ZernioClient({
    apiKey: 'sk_test',
    fetchImpl: (async () => jsonResponse({ error: 'chave invalida', code: 'unauthorized' }, 401)) as typeof fetch,
  });

  await assert.rejects(() => client.listAccounts(), /Zernio: chave invalida/);
});

test('publishViaZernio publica, registra e marca o post', async () => {
  const records: PublishedRecord[] = [];
  const saved: Post[] = [];
  const client = new ZernioClient({
    apiKey: 'sk_test',
    fetchImpl: (async () =>
      jsonResponse(
        {
          post: {
            _id: 'post-1',
            status: 'published',
            platforms: [
              { platform: 'instagram', status: 'published', platformPostUrl: 'https://instagram.com/p/x' },
            ],
          },
        },
        201,
      )) as typeof fetch,
  });

  const outcome = await publishViaZernio(post(), {
    client,
    accountId: 'acc-1',
    yes: true,
    skipMediaCheck: true,
    store: {
      isPublished: async () => false,
      append: async (record) => {
        records.push(record);
      },
      save: async (value) => {
        saved.push(value);
      },
    },
  });

  assert.equal(outcome.status, 'published');
  assert.equal(outcome.postId, 'post-1');
  assert.equal(outcome.url, 'https://instagram.com/p/x');
  assert.equal(records.length, 1);
  assert.equal(saved[0]?.status, 'published');
});

test('publishViaZernio com draft salva rascunho e nao registra', async () => {
  const records: PublishedRecord[] = [];
  const client = new ZernioClient({
    apiKey: 'sk_test',
    fetchImpl: (async () =>
      jsonResponse({ post: { _id: 'draft-1', status: 'draft' } }, 201)) as typeof fetch,
  });

  const outcome = await publishViaZernio(post(), {
    client,
    accountId: 'acc-1',
    draft: true,
    skipMediaCheck: true,
    store: {
      isPublished: async () => false,
      append: async (record) => {
        records.push(record);
      },
      save: async () => undefined,
    },
  });

  assert.equal(outcome.status, 'draft');
  assert.equal(outcome.postId, 'draft-1');
  assert.equal(records.length, 0);
});
