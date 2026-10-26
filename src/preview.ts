import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

import type { Brand } from './brand.js';
import type { Post } from './content/schema.js';
import type { Issue } from './content/rules.js';
import { assetsDir, previewDir } from './paths.js';

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function imageSources(post: Post): string[] {
  const locals = (post.slides ?? []).map((_, index) =>
    resolve(assetsDir, post.slug, `slide-${String(index + 1).padStart(2, '0')}.jpg`),
  );
  if (locals.length > 0 && locals.every((file) => existsSync(file))) {
    return locals.map((file) => pathToFileURL(file).toString());
  }
  return post.media ?? [];
}

export function buildPreviewHtml(post: Post, brand: Brand, issues: Issue[]): string {
  const images = imageSources(post);
  const media = images
    .map(
      (src, index) => `<figure class="slide">
        <img src="${esc(src)}" alt="${esc(post.alt_text ?? `Slide ${index + 1}`)}" />
        <figcaption>${index + 1}/${images.length}</figcaption>
      </figure>`,
    )
    .join('\n');

  const issueItems = issues
    .map((issue) => `<li class="${issue.level}"><strong>${issue.level}</strong> ${esc(issue.field)}: ${esc(issue.message)}</li>`)
    .join('\n');

  const schedule = post.scheduled_for
    ? `<span class="chip">agendado: ${esc(new Date(post.scheduled_for).toLocaleString('pt-BR'))}</span>`
    : '';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Preview — ${esc(post.slug)}</title>
<style>
  :root { --accent: ${esc(brand.accent)}; --fg: ${esc(brand.fg)}; --muted: ${esc(brand.muted)}; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #0d1117; color: #e6edf3; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
  header { padding: 24px 32px; border-bottom: 1px solid #21262d; display: flex; gap: 16px; flex-wrap: wrap; align-items: baseline; }
  header h1 { font-size: 18px; margin: 0; }
  header .slug { color: var(--muted); font-size: 13px; }
  .chip { border: 1px solid #30363d; border-radius: 999px; padding: 4px 12px; font-size: 12px; color: var(--muted); }
  main { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 32px; padding: 32px; align-items: start; }
  @media (max-width: 980px) { main { grid-template-columns: 1fr; } }
  .carousel { display: flex; gap: 20px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 12px; }
  .slide { margin: 0; flex: 0 0 min(420px, 80vw); scroll-snap-align: start; }
  .slide img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; border-radius: 14px; display: block; background: #fff; }
  .slide figcaption { text-align: center; color: var(--muted); font-size: 12px; margin-top: 8px; }
  aside { background: #161b22; border: 1px solid #21262d; border-radius: 14px; padding: 20px; position: sticky; top: 24px; }
  aside h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); margin: 0 0 12px; }
  .caption { white-space: pre-wrap; line-height: 1.5; font-size: 14px; margin: 0 0 20px; }
  .alt { font-size: 12px; color: var(--muted); border-left: 3px solid var(--accent); padding-left: 10px; margin-bottom: 20px; }
  ul.issues { list-style: none; padding: 0; margin: 0; font-size: 13px; }
  ul.issues li { padding: 8px 10px; border-radius: 8px; margin-bottom: 8px; }
  ul.issues li.error { background: #3d1418; color: #ffb3ba; }
  ul.issues li.warn { background: #3d2e14; color: #ffd9a0; }
  .ok { color: #7ee787; font-size: 13px; }
  .footer { padding: 0 32px 32px; color: #484f58; font-size: 12px; }
</style>
</head>
<body>
<header>
  <h1>${esc(post.slug)}</h1>
  <span class="slug">${esc(post.type)} · ${esc(post.status)}</span>
  ${schedule}
  ${post.is_ai_generated ? '<span class="chip">IA</span>' : ''}
</header>
<main>
  <section>
    <div class="carousel">
      ${media || '<p>Sem imagens. Rode <code>ig render</code>.</p>'}
    </div>
  </section>
  <aside>
    <h2>Legenda</h2>
    <p class="caption">${esc(post.caption)}</p>
    ${post.alt_text ? `<h2>Texto alternativo</h2><p class="alt">${esc(post.alt_text)}</p>` : ''}
    <h2>Validacao</h2>
    ${issueItems ? `<ul class="issues">${issueItems}</ul>` : '<p class="ok">Sem problemas encontrados.</p>'}
  </aside>
</main>
<div class="footer">Gerado por ig preview · ${new Date().toISOString()}</div>
</body>
</html>
`;
}

export async function writePreview(post: Post, brand: Brand, issues: Issue[]): Promise<string> {
  await mkdir(previewDir, { recursive: true });
  const file = resolve(previewDir, `${post.slug}.html`);
  await writeFile(file, buildPreviewHtml(post, brand, issues), 'utf8');
  return file;
}
