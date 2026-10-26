import { checkPublishingLimit } from '../graph/media.js';
import { bullet, heading, info, ok, warn } from '../log.js';
import type { CommandContext } from './util.js';
import { createClient } from './util.js';

export async function run(_ctx: CommandContext): Promise<number> {
  const client = createClient();
  const limit = await checkPublishingLimit(client);
  const used = limit.quota_usage ?? 0;
  const total = limit.config?.quota_total ?? 0;

  heading('Cota de publicacao');
  bullet('usado', `${used} nas ultimas 24h`);
  bullet('limite', total ? `${total} por ${(limit.config?.quota_duration ?? 86400) / 3600}h` : '(nao informado)');
  bullet('restante', total ? String(Math.max(0, total - used)) : '(desconhecido)');

  if (total > 0 && used >= total) {
    warn('Cota esgotada; novas publicacoes serao rejeitadas ate a janela renovar.');
  } else {
    ok('Ha cota disponivel.');
  }
  if (!total) info('A API nao retornou quota_total; consulte a documentacao da Meta.');
  return 0;
}
