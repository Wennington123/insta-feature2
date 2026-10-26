import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { AppError } from '../errors.js';
import { GraphClient } from '../graph/client.js';
import { readConfig, readConfigSafe } from '../config.js';
import type { Post } from '../content/schema.js';

export interface CommandContext {
  options: Record<string, string | boolean | undefined>;
  positionals: string[];
}

export function flag(ctx: CommandContext, name: string): boolean {
  return ctx.options[name] === true;
}

export function option(ctx: CommandContext, name: string): string | undefined {
  const value = ctx.options[name];
  return typeof value === 'string' ? value : undefined;
}

export function requirePositional(ctx: CommandContext, index: number, label: string): string {
  const value = ctx.positionals[index];
  if (!value) throw new AppError(`Informe ${label}.`, { hint: 'Rode `ig help` para ver o uso.' });
  return value;
}

export function createClient(options: { allowPlaceholder?: boolean } = {}): GraphClient {
  const config = readConfigSafe();
  if (!config && options.allowPlaceholder) {
    return new GraphClient({
      token: 'dry-run-token',
      userId: process.env.IG_USER_ID || '<IG_USER_ID>',
      host: 'graph.instagram.com',
      version: process.env.IG_API_VERSION ?? 'v26.0',
    });
  }
  const resolved = config ?? readConfig();
  return new GraphClient({
    token: resolved.accessToken,
    userId: resolved.userId,
    host: resolved.host,
    version: resolved.apiVersion,
  });
}

export async function confirmByTyping(post: Post): Promise<boolean> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    console.log(`\nPost: ${post.slug} (${post.type})`);
    console.log(`Legenda: ${post.caption.slice(0, 160).replace(/\s+/g, ' ')}${post.caption.length > 160 ? '...' : ''}`);
    const answer = await rl.question(`\nDigite o slug "${post.slug}" para publicar (Enter vazio cancela): `);
    return answer.trim() === post.slug;
  } finally {
    rl.close();
  }
}
