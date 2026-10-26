import test from 'node:test';
import assert from 'node:assert/strict';

import { selectDue } from '../src/content/load.js';
import type { PublishedRecord } from '../src/content/load.js';
import type { Post } from '../src/content/schema.js';
import { parseGitHubRemote } from '../src/media/github-url.js';

function post(slug: string, scheduledFor: string | undefined, status: Post['status'] = 'scheduled'): Post {
  return {
    slug,
    type: 'image',
    status,
    caption: 'teste',
    alt_text: 'teste',
    media: ['https://example.com/a.jpg'],
    scheduled_for: scheduledFor,
  };
}

function record(slug: string): PublishedRecord {
  return {
    slug,
    mediaId: 'm',
    containerId: 'c',
    publishedAt: new Date().toISOString(),
    machine: 'test',
    captionHash: 'x',
  };
}

test('selectDue escolhe apenas agendados vencidos e nao publicados', () => {
  const now = new Date('2026-10-28T18:00:00-03:00');
  const posts = [
    post('vencido', '2026-10-28T17:00:00-03:00'),
    post('futuro', '2026-10-28T19:00:00-03:00'),
    post('ja-publicado', '2026-10-28T17:00:00-03:00'),
    post('sem-data', undefined, 'ready'),
  ];
  const due = selectDue(posts, [record('ja-publicado')], now).map((item) => item.slug);
  assert.deepEqual(due, ['vencido']);
});

test('selectDue ordena pelo horario e usa UTC', () => {
  const now = new Date('2026-10-29T00:00:00Z');
  const posts = [
    post('tarde', '2026-10-28T18:00:00-03:00'),
    post('cedo', '2026-10-28T20:00:00Z'),
  ];
  const due = selectDue(posts, [], now).map((item) => item.slug);
  assert.deepEqual(due, ['cedo', 'tarde']);
});

test('selectDue respeita tolerancia', () => {
  const now = new Date('2026-10-28T18:00:00Z');
  const posts = [post('em-cinco', '2026-10-28T18:05:00Z')];
  assert.equal(selectDue(posts, [], now).length, 0);
  assert.equal(selectDue(posts, [], now, 5 * 60 * 1000).length, 1);
});

test('parseGitHubRemote aceita https, ssh e scp', () => {
  assert.deepEqual(parseGitHubRemote('https://github.com/wtec/insta.git'), { owner: 'wtec', repo: 'insta' });
  assert.deepEqual(parseGitHubRemote('git@github.com:wtec/insta.git'), { owner: 'wtec', repo: 'insta' });
  assert.deepEqual(parseGitHubRemote('ssh://git@github.com/wtec/insta'), { owner: 'wtec', repo: 'insta' });
  assert.equal(parseGitHubRemote('https://gitlab.com/wtec/insta.git'), null);
});
