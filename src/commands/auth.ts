import { AppError } from '../errors.js';
import { loadEnv, readConfigSafe, readConfig } from '../config.js';
import { updateEnvFile } from '../config-write.js';
import { GraphClient } from '../graph/client.js';
import { getMe } from '../graph/media.js';
import { refreshLongLivedToken } from '../graph/token.js';
import { bullet, c, heading, info, maskToken, ok, warn } from '../log.js';
import type { CommandContext } from './util.js';

function clientFor(token: string, userId = ''): GraphClient {
  const config = readConfigSafe();
  return new GraphClient({
    token,
    userId,
    host: config?.host ?? 'graph.instagram.com',
    version: config?.apiVersion ?? 'v26.0',
  });
}

function tokenFromEnv(): string {
  loadEnv();
  const token = process.env.IG_ACCESS_TOKEN;
  if (!token) {
    throw new AppError('IG_ACCESS_TOKEN nao configurado.', {
      hint: 'Rode `ig auth set <user_id> <token>` ou edite o .env.',
    });
  }
  return token;
}

async function check(ctx: CommandContext): Promise<number> {
  const token = tokenFromEnv();
  const me = await getMe(clientFor(token));
  const userId = me.user_id ?? me.id;
  const username = me.username ? `@${me.username}` : '(sem username)';

  heading('Conta');
  bullet('username', username);
  bullet('account_type', me.account_type ?? '(nao retornado)');
  bullet('user_id', userId ?? '(nao retornado)');
  bullet('token', maskToken(token));

  if (userId) {
    if (ctx.options.write === true) {
      updateEnvFile({ IG_USER_ID: userId });
      ok('IG_USER_ID gravado no .env');
    } else if (!process.env.IG_USER_ID) {
      info(c.dim(`   grave com: ig auth check --write`));
    } else if (process.env.IG_USER_ID !== userId) {
      warn(`IG_USER_ID do .env (${process.env.IG_USER_ID}) difere do retornado (${userId}).`);
    }
  }

  if (me.account_type && !['BUSINESS', 'CREATOR', 'MEDIA_CREATOR'].includes(me.account_type)) {
    warn('Publicacao via API exige conta Business ou Creator.');
  }
  return 0;
}

async function refresh(ctx: CommandContext): Promise<number> {
  loadEnv();
  const token = tokenFromEnv();
  const result = await refreshLongLivedToken(clientFor(token), token);
  const days = result.expiresIn ? Math.floor(result.expiresIn / 86400) : undefined;

  heading('Token renovado');
  bullet('novo token', maskToken(result.accessToken));
  if (days) bullet('validade', `${days} dias`);
  ok('Token renovado com sucesso.');

  if (ctx.options.write === true) {
    updateEnvFile({ IG_ACCESS_TOKEN: result.accessToken });
    ok('IG_ACCESS_TOKEN atualizado no .env.');
  } else {
    info(c.dim('   use --write para salvar no .env'));
  }
  return 0;
}

async function set(ctx: CommandContext): Promise<number> {
  const userId = ctx.positionals[2];
  const token = ctx.positionals[3];
  if (!userId || !token) {
    throw new AppError('Uso: ig auth set <user_id> <token>', {
      hint: 'Descubra o user_id com `ig auth check` ou no painel da Meta.',
    });
  }
  const changed = updateEnvFile({ IG_USER_ID: userId, IG_ACCESS_TOKEN: token });
  if (changed.length === 0) {
    info('Nada mudou.');
  } else {
    ok(`Gravado no .env: ${changed.join(', ')}`);
  }
  const config = readConfig();
  bullet('user id', config.userId);
  bullet('token', maskToken(config.accessToken));
  return 0;
}

export async function run(ctx: CommandContext): Promise<number> {
  const sub = ctx.positionals[1];
  switch (sub) {
    case 'set':
      return set(ctx);
    case 'check':
      return check(ctx);
    case 'refresh':
      return refresh(ctx);
    default:
      throw new AppError('Subcomando de auth desconhecido.', {
        hint: 'Use: ig auth set <user_id> <token> | ig auth check [--write] | ig auth refresh [--write]',
      });
  }
}
