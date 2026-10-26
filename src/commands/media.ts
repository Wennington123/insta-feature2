import { existsSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { readConfigSafe } from '../config.js';
import { AppError } from '../errors.js';
import { bullet, error, heading, info, ok, warn } from '../log.js';
import { checkPublicMedia } from '../media/check.js';
import { resolveMediaUrl } from '../media/github-url.js';
import { repoRoot } from '../paths.js';
import type { CommandContext } from './util.js';
import { flag } from './util.js';

function ensureInsideRepo(input: string): string {
  const abs = resolve(repoRoot, input);
  const rel = relative(repoRoot, abs);
  if (rel.startsWith('..') || rel === '') {
    throw new AppError('O arquivo precisa estar dentro do repositorio.');
  }
  if (!existsSync(abs)) {
    throw new AppError(`Arquivo nao encontrado: ${abs}`);
  }
  return abs;
}

export async function run(ctx: CommandContext): Promise<number> {
  const sub = ctx.positionals[1];
  const config = readConfigSafe();

  if (sub === 'url') {
    const target = ctx.positionals[2];
    if (!target) throw new AppError('Uso: ig media url <arquivo>');
    const abs = ensureInsideRepo(target);
    const url = resolveMediaUrl(abs, config?.mediaBaseUrl);
    if (!url) {
      throw new AppError('Nao foi possivel montar a URL publica.', {
        hint: 'Configure IG_MEDIA_BASE_URL no .env ou o remote origin do GitHub.',
      });
    }
    heading('URL publica');
    info(url);

    if (flag(ctx, 'check')) {
      const check = await checkPublicMedia(url);
      if (check.ok) ok(`${check.contentType} (${check.bytes ? `${(check.bytes / 1024).toFixed(0)} KB` : 'tamanho desconhecido'})`);
      else check.problems.forEach((problem) => error(problem));
      return check.ok ? 0 : 1;
    }
    return 0;
  }

  if (sub === 'check') {
    const url = ctx.positionals[2];
    if (!url) throw new AppError('Uso: ig media check <url>');
    const check = await checkPublicMedia(url);
    heading('Checagem de midia');
    bullet('url', url);
    bullet('http', String(check.status ?? '(sem resposta)'));
    bullet('content-type', check.contentType ?? '(ausente)');
    bullet('tamanho', check.bytes ? `${(check.bytes / 1024).toFixed(0)} KB` : '(desconhecido)');
    check.warnings.forEach((warning) => warn(warning));
    check.problems.forEach((problem) => error(problem));
    if (check.ok) ok('A Meta consegue baixar esta midia.');
    return check.ok ? 0 : 1;
  }

  throw new AppError('Subcomando de media desconhecido.', {
    hint: 'Use: ig media url <arquivo> | ig media check <url>',
  });
}
