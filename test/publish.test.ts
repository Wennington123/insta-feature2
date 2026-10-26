import test from 'node:test';
import assert from 'node:assert/strict';

import { publishPost, type PublishStore } from '../src/core/publish.js';
import type { Post } from '../src/content/schema.js';
import type { PublishedRecord } from '../src/content/load.js';
import { GraphClient, type FetchImpl } from '../src/graph/client.js';

interface Call {
  method: string;
  path: string;
  body: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function makeStore(): { store: PublishStore; saved: Post[]; records: PublishedRecord[] } {
  const saved: Post[] = [];
  const records: PublishedRecord[] = [];
  return {
    store: {
      isPublished: async (slug) => records.some((record) => record.slug === slug),
      append: async (record) => {
        records.push(record);
      },
      save: async (value) => {
        saved.push(value);
      },
    },
    saved,
    records,
  };
}

function imagePost(overrides: Partial<Post> = {}): Post {
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

test('publica imagem: cria container, aguarda FINISHED e publica', async () => {
  const calls: Call[] = [];
  const fetchImpl: FetchImpl = async (input, init) => {
    const url = new URL(String(input));
    calls.push({
      method: init?.method ?? 'GET',
      path: url.pathname,
      body: String(init?.body ?? ''),
    });
    if (url.pathname.endsWith('/media')) return json({ id: 'container-1' });
    if (url.pathname.endsWith('/container-1')) return json({ status_code: 'FINISHED' });
    if (url.pathname.endsWith('/media_publish')) return json({ id: 'media-1' });
    if (url.pathname.endsWith('/media-1')) return json({ permalink: 'https://instagram.com/p/abc' });
    throw new Error(`rota nao mockada: ${url.pathname}`);
  };

  const client = new GraphClient({ token: 'tok', userId: '123', fetchImpl, sleep: async () => {} });
  const { store, saved, records } = makeStore();

  const outcome = await publishPost(imagePost(), client, {
    yes: true,
    skipMediaCheck: true,
    store,
    wait: { sleep: async () => {} },
  });

  assert.equal(outcome.status, 'published');
  assert.equal(outcome.mediaId, 'media-1');
  assert.equal(outcome.permalink, 'https://instagram.com/p/abc');
  assert.deepEqual(
    calls.map((call) => `${call.method} ${call.path}`),
    [
      'POST /v26.0/123/media',
      'GET /v26.0/container-1',
      'POST /v26.0/123/media_publish',
      'GET /v26.0/media-1',
    ],
  );
  assert.equal(records.length, 1);
  assert.equal(records[0]?.slug, 'post-teste');
  assert.equal(saved[0]?.status, 'published');
});

test('dry-run nao dispara nenhuma chamada', async () => {
  let called = 0;
  const fetchImpl: FetchImpl = async () => {
    called += 1;
    return json({});
  };
  const client = new GraphClient({ token: 'tok', userId: '123', fetchImpl });
  const { store } = makeStore();

  const outcome = await publishPost(imagePost(), client, { dryRun: true, store });

  assert.equal(outcome.status, 'dry-run');
  assert.equal(called, 0);
});

test('--no-publish cria container mas nao publica', async () => {
  const calls: Call[] = [];
  const fetchImpl: FetchImpl = async (input, init) => {
    const url = new URL(String(input));
    calls.push({ method: init?.method ?? 'GET', path: url.pathname, body: '' });
    if (url.pathname.endsWith('/media')) return json({ id: 'container-1' });
    if (url.pathname.endsWith('/container-1')) return json({ status_code: 'FINISHED' });
    throw new Error(`nao deveria publicar: ${url.pathname}`);
  };
  const client = new GraphClient({ token: 'tok', userId: '123', fetchImpl, sleep: async () => {} });
  const { store, records } = makeStore();

  const outcome = await publishPost(imagePost(), client, {
    yes: true,
    noPublish: true,
    skipMediaCheck: true,
    store,
    wait: { sleep: async () => {} },
  });

  assert.equal(outcome.status, 'container-only');
  assert.equal(records.length, 0);
  assert.ok(calls.every((call) => !call.path.endsWith('/media_publish')));
});

test('slug ja publicado e recusado sem --force', async () => {
  const fetchImpl: FetchImpl = async () => {
    throw new Error('nao deveria chamar a API');
  };
  const client = new GraphClient({ token: 'tok', userId: '123', fetchImpl });
  const { store, records } = makeStore();
  records.push({
    slug: 'post-teste',
    mediaId: 'm',
    containerId: 'c',
    publishedAt: new Date().toISOString(),
    machine: 'test',
    captionHash: 'x',
  });

  await assert.rejects(
    () => publishPost(imagePost(), client, { yes: true, skipMediaCheck: true, store }),
    /ja foi publicado/,
  );
});

test('post invalido falha antes de qualquer chamada', async () => {
  let called = 0;
  const fetchImpl: FetchImpl = async () => {
    called += 1;
    return json({});
  };
  const client = new GraphClient({ token: 'tok', userId: '123', fetchImpl });
  const { store } = makeStore();

  await assert.rejects(
    () => publishPost(imagePost({ alt_text: undefined }), client, { yes: true, store }),
    /invalido/,
  );
  assert.equal(called, 0);
});

test('carrossel cria containers filhos, container pai e publica', async () => {
  let childCount = 0;
  const calls: Call[] = [];
  const fetchImpl: FetchImpl = async (input, init) => {
    const url = new URL(String(input));
    const body = String(init?.body ?? '');
    calls.push({ method: init?.method ?? 'GET', path: url.pathname, body });

    if (url.pathname.endsWith('/media') && init?.method === 'POST') {
      if (body.includes('media_type=CAROUSEL')) return json({ id: 'carousel-1' });
      childCount += 1;
      return json({ id: `child-${childCount}` });
    }
    if (url.pathname.endsWith('/carousel-1')) return json({ status_code: 'FINISHED' });
    if (url.pathname.includes('/child-')) return json({ status_code: 'FINISHED' });
    if (url.pathname.endsWith('/media_publish')) return json({ id: 'media-2' });
    if (url.pathname.endsWith('/media-2')) return json({ permalink: 'https://instagram.com/p/car' });
    throw new Error(`rota nao mockada: ${url.pathname}`);
  };
  const client = new GraphClient({ token: 'tok', userId: '123', fetchImpl, sleep: async () => {} });
  const { store } = makeStore();

  const post = imagePost({
    type: 'carousel',
    media: ['https://example.com/1.jpg', 'https://example.com/2.jpg', 'https://example.com/3.jpg'],
  });

  const outcome = await publishPost(post, client, {
    yes: true,
    skipMediaCheck: true,
    store,
    wait: { sleep: async () => {} },
  });

  assert.equal(outcome.status, 'published');
  assert.equal(childCount, 3);
  const parentCall = calls.find((call) => call.body.includes('media_type=CAROUSEL'));
  assert.ok(parentCall?.body.includes('children=child-1%2Cchild-2%2Cchild-3'));
});
