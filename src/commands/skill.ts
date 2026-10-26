import { existsSync } from 'node:fs';
import { cp, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

import { AppError } from '../errors.js';
import { bullet, heading, info, ok, warn } from '../log.js';
import { skillsDir } from '../paths.js';
import type { CommandContext } from './util.js';

const SOURCE = resolve(skillsDir, 'instagram-agent');

function targets(): string[] {
  const list = [resolve(homedir(), '.commandcode', 'skills', 'instagram-agent')];
  if (existsSync(resolve(homedir(), '.claude'))) {
    list.push(resolve(homedir(), '.claude', 'skills', 'instagram-agent'));
  }
  return list;
}

export async function run(ctx: CommandContext): Promise<number> {
  const sub = ctx.positionals[1];

  if (sub === 'path') {
    heading('Skill');
    bullet('origem', SOURCE);
    for (const target of targets()) {
      bullet('instalada', `${target}${existsSync(target) ? '' : ' (ausente)'}`);
    }
    return 0;
  }

  if (sub === 'install') {
    if (!existsSync(resolve(SOURCE, 'SKILL.md'))) {
      throw new AppError(`Skill nao encontrada em ${SOURCE}`);
    }
    for (const target of targets()) {
      await mkdir(resolve(target, '..'), { recursive: true });
      await cp(SOURCE, target, { recursive: true, force: true });
      ok(`Instalada em ${target}`);
    }
    warn('Reinicie a sessao do agente para carregar a skill.');
    info('Depois e so pedir: "faz um carrossel sobre X".');
    return 0;
  }

  throw new AppError('Subcomando de skill desconhecido.', {
    hint: 'Use: ig skill install | ig skill path',
  });
}
