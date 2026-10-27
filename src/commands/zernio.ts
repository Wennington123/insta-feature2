import { AppError } from '../errors.js';
import { loadBrand } from '../brand.js';
import { readZernioConfig } from '../config.js';
import { updateEnvFile } from '../config-write.js';
import { bullet, c, heading, info, ok } from '../log.js';
import { openPath } from '../open.js';
import { ZernioClient, type ZernioAccount } from '../providers/zernio.js';
import type { CommandContext } from './util.js';
import { flag, option } from './util.js';

const POLL_INTERVAL_MS = 5_000;
const CONNECT_TIMEOUT_MS = 10 * 60 * 1_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createClient(): ZernioClient {
  const config = readZernioConfig();
  return new ZernioClient({ apiKey: config.apiKey, baseUrl: config.baseUrl });
}

function describeAccount(account: ZernioAccount): string {
  const name = account.username
    ? `@${account.username}`
    : account.displayName ?? account.name ?? '(sem nome)';
  return `${account.platform.padEnd(10)} ${name} ${c.dim(account._id)}`;
}

function saveAccountId(account: ZernioAccount): void {
  updateEnvFile({ ZERNIO_ACCOUNT_ID: account._id });
  ok('ZERNIO_ACCOUNT_ID gravado no .env');
}

async function accounts(ctx: CommandContext): Promise<number> {
  const config = readZernioConfig();
  const client = createClient();
  const list = await client.listAccounts();

  heading('Contas conectadas no Zernio');
  if (list.length === 0) {
    info('  Nenhuma conta. Rode `ig zernio connect`.');
  }
  for (const account of list) {
    info(`  ${describeAccount(account)}`);
  }
  if (config.accountId) {
    bullet('conta atual', config.accountId);
  }
  return 0;
}

async function check(_ctx: CommandContext): Promise<number> {
  const client = createClient();
  const list = await client.listAccounts();

  heading('Zernio');
  ok(`Chave valida. ${list.length} conta(s) conectada(s).`);
  for (const account of list) {
    info(`  ${describeAccount(account)}`);
  }
  return 0;
}

async function connect(ctx: CommandContext): Promise<number> {
  const config = readZernioConfig();
  const client = createClient();
  const write = flag(ctx, 'write');

  let profileId = option(ctx, 'profile') ?? config.profileId;
  if (!profileId) {
    const created = await client.createProfile(loadBrand().name);
    profileId = created._id;
    ok(`Perfil criado no Zernio: ${profileId}`);
    if (write) {
      updateEnvFile({ ZERNIO_PROFILE_ID: profileId });
      ok('ZERNIO_PROFILE_ID gravado no .env');
    }
  } else {
    bullet('perfil', profileId);
  }

  const connected = (await client.listAccounts()).filter((account) => account.platform === 'instagram');
  if (connected.length > 0) {
    const account = connected[0] as ZernioAccount;
    heading('Instagram ja conectado');
    info(`  ${describeAccount(account)}`);
    if (write) {
      saveAccountId(account);
    } else {
      info(c.dim('   use --write para gravar ZERNIO_ACCOUNT_ID no .env'));
    }
    return 0;
  }

  const authUrl = await client.getInstagramConnectUrl(profileId);
  heading('Conecte o Instagram');
  info(authUrl);
  info(c.dim('Abra a URL, entre com @w_tec e aprove o acesso.'));
  if (!flag(ctx, 'no-open')) {
    openPath(authUrl);
  }

  info('Aguardando a conta aparecer no Zernio...');
  const account = await waitForInstagram(client);
  if (!account) {
    throw new AppError('A conta do Instagram nao apareceu no Zernio.', {
      hint: 'Abra a URL, conclua o login e rode `ig zernio accounts` para conferir.',
    });
  }

  ok(`Instagram conectado: ${describeAccount(account)}`);
  if (write) {
    saveAccountId(account);
  } else {
    info(c.dim('   use --write para gravar ZERNIO_ACCOUNT_ID no .env'));
  }
  return 0;
}

async function waitForInstagram(client: ZernioClient): Promise<ZernioAccount | undefined> {
  const deadline = Date.now() + CONNECT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const list = await client.listAccounts();
    const account = list.find((item) => item.platform === 'instagram');
    if (account) {
      return account;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  return undefined;
}

export async function run(ctx: CommandContext): Promise<number> {
  const sub = ctx.positionals[1];
  switch (sub) {
    case 'connect':
      return connect(ctx);
    case 'accounts':
      return accounts(ctx);
    case 'check':
      return check(ctx);
    case 'publish': {
      const publish = await import('./publish.js');
      return publish.run({ ...ctx, positionals: ctx.positionals.slice(1), options: { ...ctx.options, via: 'zernio' } });
    }
    case 'due': {
      const due = await import('./due.js');
      return due.run({ ...ctx, options: { ...ctx.options, via: 'zernio' } });
    }
    default:
      throw new AppError('Subcomando do Zernio desconhecido.', {
        hint: 'Use: ig zernio connect [--write] | accounts | check | publish <slug> | due',
      });
  }
}
