import { loadPost, savePost } from '../content/load.js';
import { hasErrors, validatePost, type Issue } from '../content/rules.js';
import { checkPublicMedia, expectedKind } from '../media/check.js';
import { c, error, heading, info, ok, warn } from '../log.js';
import type { CommandContext } from './util.js';
import { flag, requirePositional } from './util.js';

function printIssues(issues: Issue[]): void {
  for (const issue of issues) {
    const label = issue.level === 'error' ? c.red('erro') : c.yellow('warn');
    console.log(`${label} ${c.dim(issue.field)}: ${issue.message}`);
  }
}

export async function run(ctx: CommandContext): Promise<number> {
  const slug = requirePositional(ctx, 1, 'o slug do post');
  const post = await loadPost(slug);
  heading(`Validando ${slug}`);

  const issues = validatePost(post);

  if (!flag(ctx, 'offline')) {
    for (const [index, url] of (post.media ?? []).entries()) {
      const check = await checkPublicMedia(url, { expect: expectedKind(url) });
      for (const warning of check.warnings) {
        issues.push({ level: 'warn', field: `media[${index}]`, message: warning });
      }
      for (const problem of check.problems) {
        issues.push({ level: 'error', field: `media[${index}]`, message: problem });
      }
    }
  } else {
    info(c.dim('modo offline: verificacao de URL ignorada'));
  }

  if (issues.length === 0) {
    ok('Nenhum problema encontrado.');
  } else {
    printIssues(issues);
  }

  if (hasErrors(issues)) {
    error(`${issues.filter((issue) => issue.level === 'error').length} erro(s).`);
    return 1;
  }

  if (post.status === 'draft') {
    const nextStatus = post.scheduled_for ? 'scheduled' : 'ready';
    await savePost({ ...post, status: nextStatus });
    ok(`Status atualizado para "${nextStatus}".`);
  }
  return 0;
}
