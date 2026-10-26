import test from 'node:test';
import assert from 'node:assert/strict';

import { hasErrors, validatePost } from '../src/content/rules.js';
import type { Post } from '../src/content/schema.js';

function post(overrides: Partial<Post> = {}): Post {
  return {
    slug: 'post-teste',
    type: 'image',
    status: 'ready',
    caption: 'Legenda com #tag',
    alt_text: 'descricao da imagem',
    media: ['https://example.com/foto.jpg'],
    ...overrides,
  };
}

function errors(value: Post): string[] {
  return validatePost(value)
    .filter((issue) => issue.level === 'error')
    .map((issue) => issue.field);
}

test('post de imagem valido nao tem erros', () => {
  assert.deepEqual(errors(post()), []);
});

test('imagem exige alt_text', () => {
  assert.deepEqual(errors(post({ alt_text: undefined })), ['alt_text']);
});

test('legenda acima de 2200 caracteres falha', () => {
  assert.ok(errors(post({ caption: 'a'.repeat(2201) })).includes('caption'));
});

test('mais de 30 hashtags falha', () => {
  const caption = Array.from({ length: 31 }, (_, index) => `#tag${index}`).join(' ');
  assert.ok(errors(post({ caption })).includes('caption'));
});

test('carrossel precisa de 2 a 20 midias', () => {
  const one = post({ type: 'carousel', media: ['https://example.com/a.jpg'] });
  assert.ok(errors(one).includes('media'));
});

test('carrossel com 20 midias e valido', () => {
  const media = Array.from({ length: 20 }, (_, index) => `https://example.com/${index}.jpg`);
  assert.deepEqual(errors(post({ type: 'carousel', media })), []);
});

test('URL http e rejeitada', () => {
  assert.ok(errors(post({ media: ['http://example.com/foto.jpg'] })).includes('media[0]'));
});

test('imagem png e rejeitada', () => {
  assert.ok(errors(post({ media: ['https://example.com/foto.png'] })).includes('media[0]'));
});

test('reels com jpg e rejeitado', () => {
  const value = post({ type: 'reels', alt_text: undefined, media: ['https://example.com/video.jpg'] });
  assert.ok(errors(value).includes('media[0]'));
});

test('scheduled exige data valida', () => {
  assert.ok(errors(post({ status: 'scheduled' })).includes('scheduled_for'));
  assert.ok(errors(post({ status: 'scheduled', scheduled_for: 'amanha' })).includes('scheduled_for'));
});

test('alt_text em reels gera apenas aviso', () => {
  const issues = validatePost(post({ type: 'reels', media: ['https://example.com/v.mp4'] }));
  assert.equal(hasErrors(issues), false);
  assert.ok(issues.some((issue) => issue.field === 'alt_text' && issue.level === 'warn'));
});
