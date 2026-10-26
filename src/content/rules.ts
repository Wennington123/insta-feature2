import type { Post } from './schema.js';

export const LIMITS = {
  captionMax: 2200,
  hashtagMax: 30,
  altTextMax: 1000,
  carouselMin: 2,
  carouselMax: 20,
  imageMaxBytes: 8 * 1024 * 1024,
  videoMaxBytes: 1024 * 1024 * 1024,
} as const;

export interface Issue {
  level: 'error' | 'warn';
  field: string;
  message: string;
}

export function countHashtags(caption: string): number {
  return (caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;
}

export function hasErrors(issues: Issue[]): boolean {
  return issues.some((issue) => issue.level === 'error');
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|m4v)(\?.*)?$/i.test(url);
}

function isJpegUrl(url: string): boolean {
  return /\.(jpe?g)(\?.*)?$/i.test(url);
}

function isHttpsPublicUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export function validatePost(post: Post): Issue[] {
  const issues: Issue[] = [];
  const add = (level: Issue['level'], field: string, message: string) =>
    issues.push({ level, field, message });

  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(post.slug)) {
    add('error', 'slug', 'Use 2-64 caracteres: letras minusculas, numeros e hifen.');
  }

  if (post.caption.length > LIMITS.captionMax) {
    add('error', 'caption', `Legenda com ${post.caption.length} caracteres (maximo ${LIMITS.captionMax}).`);
  }

  const tags = countHashtags(post.caption);
  if (tags > LIMITS.hashtagMax) {
    add('error', 'caption', `${tags} hashtags (maximo ${LIMITS.hashtagMax}).`);
  }

  if (post.alt_text && post.alt_text.length > LIMITS.altTextMax) {
    add('error', 'alt_text', `Texto alternativo com ${post.alt_text.length} caracteres (maximo ${LIMITS.altTextMax}).`);
  }

  if ((post.type === 'image' || post.type === 'carousel') && !post.alt_text) {
    add('error', 'alt_text', 'Obrigatorio para imagem e carrossel (acessibilidade).');
  }

  if ((post.type === 'reels' || post.type === 'story') && post.alt_text) {
    add('warn', 'alt_text', 'A Meta ignora alt_text em reels/stories; o campo sera descartado.');
  }

  const media = post.media ?? [];
  const expectedMin = post.type === 'carousel' ? LIMITS.carouselMin : 1;
  const expectedMax = post.type === 'carousel' ? LIMITS.carouselMax : 1;

  if (media.length < expectedMin) {
    add(
      'error',
      'media',
      post.type === 'carousel'
        ? `Carrossel precisa de ${LIMITS.carouselMin}-${LIMITS.carouselMax} midias; encontrei ${media.length}.`
        : `Post tipo ${post.type} precisa de 1 midia; encontrei ${media.length}.`,
    );
  }
  if (media.length > expectedMax) {
    add('error', 'media', `Maximo de ${expectedMax} midias para tipo ${post.type}.`);
  }

  media.forEach((url, index) => {
    if (!isHttpsPublicUrl(url)) {
      add('error', `media[${index}]`, 'Precisa ser uma URL HTTPS publica.');
      return;
    }
    if (post.type === 'image' && !isJpegUrl(url)) {
      add('error', `media[${index}]`, 'A Meta aceita somente JPEG em imagem. Rode `ig render` ou converta.');
    }
    if (post.type === 'carousel' && !isJpegUrl(url) && !isVideoUrl(url)) {
      add('error', `media[${index}]`, 'Item de carrossel precisa ser JPEG ou video MP4/MOV.');
    }
    if (post.type === 'reels' && !isVideoUrl(url)) {
      add('error', `media[${index}]`, 'Reels exige video MP4/MOV.');
    }
    if (post.type === 'story' && !isVideoUrl(url) && !isJpegUrl(url)) {
      add('error', `media[${index}]`, 'Story aceita JPEG ou video MP4/MOV.');
    }
  });

  if (post.type === 'carousel' && post.slides && post.slides.length > 0 && post.media) {
    if (post.slides.length !== post.media.length) {
      add(
        'warn',
        'slides',
        `${post.slides.length} slides para ${post.media.length} midias. Rode "ig render" para sincronizar.`,
      );
    }
  }

  if (post.slides && post.slides.length > 0 && (!post.media || post.media.length === 0)) {
    add('warn', 'media', 'Slides definidos sem midia. Rode `ig render` para gerar os JPEGs.');
  }

  if (post.status === 'scheduled' && !post.scheduled_for) {
    add('error', 'scheduled_for', 'Status scheduled exige scheduled_for.');
  }

  if (post.scheduled_for && Number.isNaN(Date.parse(post.scheduled_for))) {
    add('error', 'scheduled_for', 'Data invalida. Use ISO 8601 com fuso, ex.: 2026-10-28T18:00:00-03:00.');
  }

  return issues;
}

export function summarizeIssues(issues: Issue[]): string {
  return issues.map((issue) => `[${issue.level}] ${issue.field}: ${issue.message}`).join('\n');
}
