import { existsSync } from 'node:fs';

import { AppError } from '../errors.js';
import { hasConfig, hasZernioConfig, loadEnv, readConfigSafe, readZernioConfig } from '../config.js';
import { ZernioClient } from '../providers/zernio.js';
import { listPosts } from '../content/load.js';
import { checkPublishingLimit, getMe } from '../graph/media.js';
import { GraphClient } from '../graph/client.js';
import { envFile, userConfigFile } from '../paths.js';
import { bullet, error, heading, info, maskToken, ok, warn } from '../log.js';
import { checkPublicMedia, expectedKind } from '../media/check.js';
import type { CommandContext } from './util.js';

const MIN_NODE_MAJOR = 20;

async function checkZernio(): Promise<number> {
  heading('Zernio');
  try {
    const config = readZernioConfig();
    const client = new ZernioClient({ apiKey: config.apiKey, baseUrl: config.baseUrl });
    const accounts = await client.listAccounts();

    ok(`ZERNIO_API_KEY valida; ${accounts.length} conta(s) conectada(s).`);
    for (const account of accounts) {
      bullet(account.platform, account.username ? `@${account.username}` : account._id);
    }

    const instagram = accounts.find((account) => account.platform === 'instagram');
    if (!instagram) {
      warn('Nenhuma conta do Instagram conectada; rode `ig zernio connect --write`.');
    } else if (!config.accountId) {
      warn(`ZERNIO_ACCOUNT_ID ausente; use ${instagram._id} ou rode \`ig zernio connect --write\`.`);
    } else {
      bullet('conta atual', config.accountId);
    }

    ok('Tudo pronto para publicar via Zernio.');
    return 0;
  } catch (err) {
    error((err as Error).message);
    return 1;
  }
}

export async function run(_ctx: CommandContext): Promise<number> {
  loadEnv();
  let failures = 0;

  heading('Ambiente');
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor >= MIN_NODE_MAJOR) {
    ok(`Node ${process.versions.node}`);
  } else {
    error(`Node ${process.versions.node}; use 20.6 ou superior.`);
    failures += 1;
  }
  bullet('repo', process.cwd());
  bullet('.env', existsSync(envFile) ? envFile : '(ausente — copie .env.example)');
  bullet('config usuario', existsSync(userConfigFile()) ? userConfigFile() : '(nao usado)');
  bullet('maquina', process.env.IG_MACHINE || '(hostname)');

  const config = readConfigSafe();
  if (!config) {
    if (hasZernioConfig()) {
      return await checkZernio();
    }
    error('Credenciais ausentes.');
    info('  1. Copie .env.example para .env');
    info('  2. Rode `ig auth set <user_id> <token>` ou edite o .env');
    info('  3. Rode `ig doctor` de novo');
    return 1;
  }

  bullet('token', maskToken(config.accessToken));
  bullet('user id (.env)', config.userId);
  bullet('host', `${config.host}/${config.apiVersion}`);
  bullet('CDN de midia', config.mediaBaseUrl ?? '(GitHub raw)');

  const client = new GraphClient({
    token: config.accessToken,
    userId: config.userId,
    host: config.host,
    version: config.apiVersion,
  });

  heading('Conta');
  try {
    const me = await getMe(client);
    const accountId = me.user_id ?? me.id;
    bullet('username', me.username ? `@${me.username}` : '(nao retornado)');
    bullet('account_type', me.account_type ?? '(nao retornado)');
    bullet('user_id', accountId ?? '(nao retornado)');

    if (me.account_type && !['BUSINESS', 'CREATOR', 'MEDIA_CREATOR'].includes(me.account_type)) {
      warn(`Conta ${me.account_type}: publicacao via API exige conta profissional.`);
    }
    if (accountId && accountId !== config.userId) {
      warn(`IG_USER_ID do .env (${config.userId}) difere do retornado (${accountId}).`);
      failures += 1;
    }
  } catch (err) {
    error((err as Error).message);
    failures += 1;
  }

  heading('Cota de publicacao');
  try {
    const limit = await checkPublishingLimit(client);
    const used = limit.quota_usage ?? 0;
    const total = limit.config?.quota_total ?? 0;
    bullet('uso', `${used}/${total || '?'} nas ultimas 24h`);
    if (total > 0 && used >= total) warn('Cota esgotada; aguarde a janela de 24h.');
  } catch (err) {
    error((err as Error).message);
    failures += 1;
  }

  heading('Midias dos posts');
  const posts = await listPosts();
  const candidates = posts.filter((post) => post.status !== 'published' && (post.media?.length ?? 0) > 0);
  if (candidates.length === 0) {
    info('  Nenhum post pendente com midia para verificar.');
  }
  for (const post of candidates) {
    for (const [index, url] of (post.media ?? []).entries()) {
      const check = await checkPublicMedia(url, { expect: expectedKind(url) });
      if (check.ok) {
        ok(`${post.slug} media[${index}] ${check.contentType ?? ''} ${check.bytes ? `${(check.bytes / 1024).toFixed(0)} KB` : ''}`);
      } else {
        error(`${post.slug} media[${index}] ${check.problems.join(' ')}`);
        failures += 1;
      }
    }
  }

  heading('Resumo');
  if (failures === 0) {
    ok('Tudo pronto para publicar.');
    return 0;
  }
  throw new AppError(`${failures} verificacao(oes) falharam.`, {
    hint: hasConfig() ? undefined : 'Configure o token antes de publicar.',
  });
}
