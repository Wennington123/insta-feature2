import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { brandFile, assetsDir, envFile, postsDir, previewDir, repoRoot } from '../paths.js';
import { createEnvFile } from '../config-write.js';
import { bullet, c, heading, info, ok, warn } from '../log.js';
import type { CommandContext } from './util.js';

function git(args: string[]): string {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  return result.status === 0 ? (result.stdout ?? '').trim() : '';
}

export async function run(_ctx: CommandContext): Promise<number> {
  heading('Inicializando projeto');

  await mkdir(postsDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });
  await mkdir(previewDir, { recursive: true });
  ok('Pastas content/posts, content/assets e out/preview.');

  if (!existsSync(envFile)) {
    const example = resolve(repoRoot, '.env.example');
    if (existsSync(example)) {
      createEnvFile(await readFile(example, 'utf8'));
      ok('.env criado a partir de .env.example');
    } else {
      createEnvFile('');
      warn('.env criado vazio (exemplo nao encontrado).');
    }
  } else {
    info('.env ja existe, mantido.');
  }

  if (!existsSync(brandFile)) {
    warn('brand.md ausente. Crie a identidade da marca antes de gerar conteudo.');
  } else {
    ok('brand.md encontrado.');
  }

  const tracked = git(['ls-files', '.env']);
  if (tracked) {
    warn('.env esta versionado no Git! Remova do indice: git rm --cached .env');
  }

  heading('Proximos passos');
  info(`  1. ${c.bold('ig auth set <user_id> <token>')}  (credenciais da conta profissional)`);
  info(`  2. ${c.bold('ig doctor')}                        (valida token, conta e cota)`);
  info(`  3. Crie um post em content/posts/<slug>.json ou peca ao agente`);
  info(`  4. ${c.bold('ig render <slug>')} → ${c.bold('ig validate <slug>')} → ${c.bold('ig preview <slug>')}`);
  info(`  5. ${c.bold('ig publish <slug>')}               (pede confirmacao digitando o slug)`);
  info(`  6. ${c.bold('ig skill install')}                (instala a skill no agente)`);

  bullet('midia publica', 'repo publico no GitHub ou IG_MEDIA_BASE_URL');
  return 0;
}
