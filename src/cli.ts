import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { asAppError, AppError } from './errors.js';
import { GraphError } from './graph/client.js';
import { c } from './log.js';
import { repoRoot } from './paths.js';
import type { CommandContext } from './commands/util.js';

import * as auth from './commands/auth.js';
import * as doctor from './commands/doctor.js';
import * as due from './commands/due.js';
import * as init from './commands/init.js';
import * as limit from './commands/limit.js';
import * as media from './commands/media.js';
import * as preview from './commands/preview.js';
import * as publish from './commands/publish.js';
import * as render from './commands/render.js';
import * as skill from './commands/skill.js';
import * as status from './commands/status.js';
import * as validate from './commands/validate.js';
import * as zernio from './commands/zernio.js';

const HELP = `ig — agente de conteudo e publicacao para Instagram (@w_tec)

Uso: ig <comando> [opcoes]

Conteudo
  render <slug>              gera JPEGs a partir de slides[] e atualiza as URLs
  validate <slug>            valida legenda, limites e midia (--offline pula URLs)
  preview <slug>             abre o preview HTML no navegador (--no-open)
  status [--all]             lista posts, agendamentos e cota

Publicacao
  publish <slug>             publica com confirmacao interativa
    --yes                    nao pergunta (uso por automacao)
    --dry-run                mostra os requests sem chamar a API
    --no-publish             cria e valida o container sem postar
    --force                  permite republicar um slug ja publicado
    --skip-media-check       pula a verificacao das URLs publicas
    --via meta|zernio        escolhe o provedor (padrao: PUBLISH_PROVIDER ou meta)
    --account <id>           conta do Zernio (padrao: ZERNIO_ACCOUNT_ID)
  due                        publica agendados vencidos
    --at <ISO>               simula outro horario
    --tolerance <min>        antecipa posts em N minutos
    --sync                   git pull antes e commit/push depois
    --dry-run                lista o que seria publicado
    --via meta|zernio        escolhe o provedor
  limit                      cota de publicacao nas ultimas 24h
  doctor                     diagnostico de ambiente, token, conta e midias

Setup
  init                       cria pastas, .env e valida o basico
  auth set <user_id> <token> grava credenciais no .env
  auth check [--write]       mostra a conta e grava o IG_USER_ID
  auth refresh [--write]     renova o token de 60 dias
  media url <arquivo>        monta a URL publica (--check valida)
  media check <url>          testa se a Meta consegue baixar a midia
  skill install | skill path instala a skill no agente / mostra caminhos

Zernio (publicacao sem app Meta)
  zernio connect [--write]   cria perfil, abre o OAuth do Instagram e grava a conta
  zernio accounts            lista as contas conectadas
  zernio check               valida a ZERNIO_API_KEY
  zernio publish <slug>      atalho para publish --via zernio
  zernio due                 atalho para due --via zernio

Exemplos
  ig render landing-pages-vendem
  ig validate landing-pages-vendem
  ig preview landing-pages-vendem
  ig publish landing-pages-vendem
  ig due --sync
`;

const OPTIONS = {
  yes: { type: 'boolean', short: 'y' },
  'dry-run': { type: 'boolean' },
  'no-publish': { type: 'boolean' },
  force: { type: 'boolean' },
  'skip-media-check': { type: 'boolean' },
  offline: { type: 'boolean' },
  all: { type: 'boolean' },
  via: { type: 'string' },
  account: { type: 'string' },
  profile: { type: 'string' },
  'no-open': { type: 'boolean' },
  write: { type: 'boolean' },
  sync: { type: 'boolean' },
  check: { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean', short: 'v' },
  at: { type: 'string' },
  tolerance: { type: 'string' },
} as const;

function packageVersion(): string {
  try {
    const raw = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as { version?: string };
    return raw.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export async function main(argv: string[]): Promise<number> {
  const parsed = parseArgs({ args: argv, allowPositionals: true, options: OPTIONS });
  const ctx: CommandContext = {
    options: parsed.values as Record<string, string | boolean | undefined>,
    positionals: parsed.positionals,
  };
  const command = ctx.positionals[0];

  if (ctx.options.version) {
    console.log(`ig ${packageVersion()}`);
    return 0;
  }
  if (ctx.options.help || !command || command === 'help') {
    console.log(HELP);
    return 0;
  }

  switch (command) {
    case 'doctor':
      return doctor.run(ctx);
    case 'init':
      return init.run(ctx);
    case 'status':
      return status.run(ctx);
    case 'validate':
      return validate.run(ctx);
    case 'render':
      return render.run(ctx);
    case 'preview':
      return preview.run(ctx);
    case 'publish':
      return publish.run(ctx);
    case 'due':
      return due.run(ctx);
    case 'limit':
      return limit.run(ctx);
    case 'auth':
      return auth.run(ctx);
    case 'media':
      return media.run(ctx);
    case 'zernio':
      return zernio.run(ctx);
    case 'skill':
      return skill.run(ctx);
    default:
      throw new AppError(`Comando desconhecido: ${command}`, { hint: 'Rode `ig help`.' });
  }
}

function reportError(error: unknown): void {
  const appError = asAppError(error);
  console.error(`\n${c.red('erro')} ${appError.message}`);
  if (error instanceof GraphError) {
    const details = [error.code ? `code ${error.code}` : undefined, error.subcode ? `subcode ${error.subcode}` : undefined, error.fbtraceId ? `fbtrace ${error.fbtraceId}` : undefined]
      .filter(Boolean)
      .join(' · ');
    if (details) console.error(c.dim(`      ${details}`));
  }
  if (appError.hint) console.error(c.dim(appError.hint));
  process.exitCode = appError.exitCode;
}

const invokedDirectly =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (invokedDirectly) {
  main(process.argv.slice(2)).catch(reportError);
}
