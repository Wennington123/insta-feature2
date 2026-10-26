import { existsSync } from 'node:fs';
import { appendFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { hostname } from 'node:os';
import { resolve } from 'node:path';

import { AppError } from '../errors.js';
import { postsDir, publishedFile } from '../paths.js';
import { parsePost, type Post } from './schema.js';

export function postPath(slug: string): string {
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(slug)) {
    throw new AppError(`Slug invalido: ${slug}`, {
      hint: 'Use letras minusculas, numeros e hifen (ex.: 3-erros-ao-subir-site).',
    });
  }
  return resolve(postsDir, `${slug}.json`);
}

export async function loadPost(slug: string): Promise<Post> {
  const file = postPath(slug);
  if (!existsSync(file)) {
    throw new AppError(`Post nao encontrado: ${file}`, { hint: 'Rode `ig status` para listar os posts.' });
  }
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    throw new AppError(`JSON invalido em ${file}: ${(error as Error).message}`);
  }
  return parsePost(raw, `${slug}.json`);
}

export async function savePost(post: Post): Promise<void> {
  const file = postPath(post.slug);
  await mkdir(postsDir, { recursive: true });
  await writeFile(file, `${JSON.stringify(post, null, 2)}\n`, 'utf8');
}

export async function listPosts(): Promise<Post[]> {
  if (!existsSync(postsDir)) return [];
  const files = (await readdir(postsDir)).filter((name) => name.endsWith('.json')).sort();
  const posts: Post[] = [];
  for (const file of files) {
    try {
      const raw: unknown = JSON.parse(await readFile(resolve(postsDir, file), 'utf8'));
      posts.push(parsePost(raw, file));
    } catch (error) {
      console.error(`aviso: ignorando ${file}: ${(error as Error).message}`);
    }
  }
  return posts;
}

export interface PublishedRecord {
  slug: string;
  mediaId: string;
  containerId: string;
  publishedAt: string;
  machine: string;
  captionHash: string;
}

export function captionHash(caption: string): string {
  return createHash('sha256').update(caption).digest('hex').slice(0, 12);
}

export function machineId(): string {
  const explicit = process.env.IG_MACHINE?.trim();
  if (explicit) return explicit;
  return `host-${createHash('sha256').update(hostname()).digest('hex').slice(0, 8)}`;
}

export async function readPublished(): Promise<PublishedRecord[]> {
  if (!existsSync(publishedFile)) return [];
  const text = await readFile(publishedFile, 'utf8');
  const records: PublishedRecord[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed) as PublishedRecord);
    } catch {
      // linha corrompida nao deve bloquear o restante do historico
    }
  }
  return records;
}

export async function appendPublished(record: PublishedRecord): Promise<void> {
  await mkdir(resolve(publishedFile, '..'), { recursive: true });
  await appendFile(publishedFile, `${JSON.stringify(record)}\n`, 'utf8');
}

export function publishedSlugs(records: PublishedRecord[]): Set<string> {
  return new Set(records.map((record) => record.slug));
}

export async function isPublished(slug: string): Promise<boolean> {
  const records = await readPublished();
  return records.some((record) => record.slug === slug);
}

export function selectDue(
  posts: Post[],
  published: PublishedRecord[],
  now: Date,
  toleranceMs = 0,
): Post[] {
  const done = publishedSlugs(published);
  const limit = now.getTime() + toleranceMs;
  return posts
    .filter((post) => post.status !== 'published')
    .filter((post) => !done.has(post.slug))
    .filter((post) => Boolean(post.scheduled_for))
    .filter((post) => Date.parse(post.scheduled_for as string) <= limit)
    .sort((a, b) => Date.parse(a.scheduled_for as string) - Date.parse(b.scheduled_for as string));
}
