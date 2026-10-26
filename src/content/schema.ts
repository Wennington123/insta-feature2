import { AppError } from '../errors.js';

export type PostType = 'image' | 'carousel' | 'reels' | 'story';
export type PostStatus = 'draft' | 'ready' | 'scheduled' | 'published';
export type SlideKind = 'cover' | 'content' | 'cta';

export interface Slide {
  kind?: SlideKind;
  eyebrow?: string;
  heading?: string;
  body?: string;
}

export interface Post {
  slug: string;
  type: PostType;
  status: PostStatus;
  caption: string;
  alt_text?: string;
  scheduled_for?: string;
  is_ai_generated?: boolean;
  slides?: Slide[];
  media?: string[];
  notes?: string;
}

export const POST_TYPES: PostType[] = ['image', 'carousel', 'reels', 'story'];
export const POST_STATUSES: PostStatus[] = ['draft', 'ready', 'scheduled', 'published'];

function asRecord(value: unknown, source: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError(`${source}: o JSON precisa ser um objeto.`);
  }
  return value as Record<string, unknown>;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function optionalStringArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new AppError('Campo "media" precisa ser um array de strings.');
  }
  return value as string[];
}

function parseSlides(value: unknown): Slide[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new AppError('Campo "slides" precisa ser um array.');
  return value.map((item, index) => {
    const slide = asRecord(item, `slides[${index}]`);
    const kind = optionalString(slide.kind);
    if (kind && kind !== 'cover' && kind !== 'content' && kind !== 'cta') {
      throw new AppError(`slides[${index}].kind invalido: use cover, content ou cta.`);
    }
    return {
      kind: kind as Slide['kind'],
      eyebrow: optionalString(slide.eyebrow),
      heading: optionalString(slide.heading),
      body: optionalString(slide.body),
    };
  });
}

export function parsePost(raw: unknown, source: string): Post {
  const data = asRecord(raw, source);

  const slug = optionalString(data.slug);
  if (!slug) throw new AppError(`${source}: campo "slug" obrigatorio.`);

  const type = optionalString(data.type);
  if (!type || !POST_TYPES.includes(type as PostType)) {
    throw new AppError(`${source}: campo "type" deve ser ${POST_TYPES.join(', ')}.`);
  }

  const status = optionalString(data.status) ?? 'draft';
  if (!POST_STATUSES.includes(status as PostStatus)) {
    throw new AppError(`${source}: campo "status" deve ser ${POST_STATUSES.join(', ')}.`);
  }

  const caption = typeof data.caption === 'string' ? data.caption : '';
  if (!caption.trim()) throw new AppError(`${source}: campo "caption" obrigatorio.`);

  return {
    slug,
    type: type as PostType,
    status: status as PostStatus,
    caption,
    alt_text: optionalString(data.alt_text),
    scheduled_for: optionalString(data.scheduled_for),
    is_ai_generated: data.is_ai_generated === true,
    slides: parseSlides(data.slides),
    media: optionalStringArray(data.media),
    notes: optionalString(data.notes),
  };
}
