import { spawnSync } from 'node:child_process';
import { readFile, unlink, writeFile } from 'node:fs/promises';

import { AppError } from '../errors.js';
import { loadEnv, readZernioConfig } from '../config.js';
import { machineId, listPosts, readPublished, selectDue } from '../content/load.js';
import { publishPost } from '../core/publish.js';
import { ZernioClient, publishViaZernio } from '../providers/zernio.js';
import { lockFile, repoRoot } from '../paths.js';
import { c, error, heading, info, ok, step, warn } from '../log.js';
import type { CommandContext } from './util.js';
import { createClient, flag, option } from './util.js';

const LOCK_TTL_MS = 10 * 60 * 1000;

function git(args: string[]): { ok: boolean; output: string } {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim(),
  };
}

async function acquireLock(): Promise<boolean> {
  const payload = JSON.stringify({ machine: machineId(), pid: process.pid, at: new Date().toISOString() });
  try {
    await writeFile(lockFile, payload, { encoding: 'utf8', flag: 'wx' });
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    const raw = await readFile(lockFile, 'utf8').catch(() => '');
    try {
      const data = JSON.parse(raw) as { at?: string; machine?: string };
      const age = Date.now() - Date.parse(data.at ?? '');
      if (Number.isFinite(age) && age < LOCK_TTL_MS) {
        warn(`Outro ig due esta ativo (${data.machine ?? 'desconhecida'}). Pulando esta execucao.`);
        return false;
      }
    } catch {
      // lock corrompido: assume travado
    }
    await writeFile(lockFile, payload, 'utf8');
    return true;
  }
}

async function releaseLock(): Promise<void> {
  await unlink(lockFile).catch(() => undefined);
}

function minutesFrom(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new AppError('--tolerance deve ser um numero de minutos.');
  }
  return parsed;
}

export async function run(ctx: CommandContext): Promise<number> {
  loadEnv();
  const dryRun = flag(ctx, 'dry-run');
  const sync = flag(ctx, 'sync');
  const provider = option(ctx, 'via') ?? process.env.PUBLISH_PROVIDER ?? 'meta';
  const atOption = option(ctx, 'at');
  const now = atOption ? new Date(atOption) : new Date();
  if (Number.isNaN(now.getTime())) throw new AppError('--at invalido; use ISO 8601.');

  if (sync) {
    if (!dryRun) {
      step('git pull --ff-only');
      const pull = git(['pull', '--ff-only']);
      if (!pull.ok) {
        throw new AppError('git pull falhou.', { hint: pull.output || 'Resolva o repositorio antes de publicar.' });
      }
    }
  }

  if (!(await acquireLock())) return 0;

  try {
    const posts = await listPosts();
    const published = await readPublished();
    const toleranceMs = minutesFrom(option(ctx, 'tolerance')) * 60 * 1000;
    const due = selectDue(posts, published, now, toleranceMs);

    heading(`Agendados vencidos (${now.toLocaleString('pt-BR')})`);
    if (due.length === 0) {
      info('  Nada para publicar agora.');
      return 0;
    }
    for (const post of due) {
      info(`  ${post.slug} · ${new Date(post.scheduled_for as string).toLocaleString('pt-BR')}`);
    }

    if (dryRun) {
      ok('Dry-run: nenhuma publicacao feita.');
      return 0;
    }

    let failures = 0;
    if (provider === 'zernio') {
      const config = readZernioConfig();
      const accountId = option(ctx, 'account') ?? config.accountId;
      if (!accountId) {
        throw new AppError('ZERNIO_ACCOUNT_ID nao configurado.', {
          hint: 'Rode `ig zernio connect --write` ou defina ZERNIO_ACCOUNT_ID no .env.',
        });
      }
      const zernio = new ZernioClient({ apiKey: config.apiKey, baseUrl: config.baseUrl });
      for (const post of due) {
        try {
          step(`Publicando ${post.slug} via Zernio...`);
          const outcome = await publishViaZernio(post, { client: zernio, accountId, yes: true });
          if (outcome.status === 'published') {
            ok(`${post.slug} publicado (post_id=${outcome.postId})`);
            if (outcome.url) console.log(`  ${c.cyan(outcome.url)}`);
          }
        } catch (err) {
          failures += 1;
          error(`${post.slug}: ${(err as Error).message}`);
        }
      }
    } else if (provider === 'meta') {
      const client = createClient();
      for (const post of due) {
        try {
          step(`Publicando ${post.slug}...`);
          const outcome = await publishPost(post, client, { yes: true });
          if (outcome.status === 'published') {
            ok(`${post.slug} publicado (media_id=${outcome.mediaId})`);
            if (outcome.permalink) console.log(`  ${c.cyan(outcome.permalink)}`);
          }
        } catch (err) {
          failures += 1;
          error(`${post.slug}: ${(err as Error).message}`);
        }
      }
    } else {
      throw new AppError(`Provedor desconhecido: ${provider}`, {
        hint: 'Use --via meta ou --via zernio, ou defina PUBLISH_PROVIDER no .env.',
      });
    }

    if (sync && failures === 0) {
      step('Sincronizando estado com o GitHub...');
      git(['add', 'content/published.jsonl', 'content/posts']);
      const commit = git(['commit', '-m', `chore(content): publica ${due.map((post) => post.slug).join(', ')}`]);
      if (commit.ok) {
        const push = git(['push']);
        if (push.ok) ok('Estado enviado para o remoto.');
        else warn(`git push falhou: ${push.output}`);
      } else {
        warn(`git commit falhou: ${commit.output}`);
      }
    }

    return failures === 0 ? 0 : 1;
  } finally {
    await releaseLock();
  }
}
