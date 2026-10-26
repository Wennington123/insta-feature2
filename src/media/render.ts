import { existsSync, readFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import sharp from 'sharp';

import type { Brand } from '../brand.js';
import type { Post, Slide } from '../content/schema.js';
import { AppError } from '../errors.js';
import { assetsDir, repoRoot } from '../paths.js';
import { estimateCharsPerLine, fitLines, xmlEscape } from './text.js';

const WIDTH = 1080;
const HEIGHT = 1350;
const PAD = 96;
const CONTENT_WIDTH = WIDTH - PAD * 2;

interface RenderResult {
  files: string[];
  warnings: string[];
}

function solid(color: string, fallback: string): string {
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : fallback;
}

function logoDataUri(brand: Brand): string | null {
  if (!brand.logoFile) return null;
  const file = resolve(repoRoot, brand.logoFile);
  if (!existsSync(file)) return null;
  const buffer = readFileSync(file);
  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

function textBlock(
  lines: string[],
  options: { x: number; y: number; size: number; color: string; font: string; weight: number; lineHeight: number; spacing?: number },
): string {
  return lines
    .map((line, index) => {
      const y = options.y + index * options.lineHeight;
      return `<text x="${options.x}" y="${y}" font-family="${xmlEscape(options.font)}" font-size="${options.size}" font-weight="${options.weight}" fill="${options.color}" letter-spacing="${options.spacing ?? 0}">${xmlEscape(line)}</text>`;
    })
    .join('\n');
}

function bracket(x: number, y: number, arm: number, direction: 1 | -1, color: string): string {
  const dx = arm * direction;
  const dy = arm * direction;
  return `<path d="M ${x} ${y + dy} L ${x} ${y} L ${x + dx} ${y}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function buildSlideSvg(input: {
  slide: Slide;
  index: number;
  total: number;
  post: Post;
  brand: Brand;
  logo: string | null;
}): { svg: string; warnings: string[] } {
  const { slide, index, total, post, brand, logo } = input;
  const kind = slide.kind ?? (index === 0 ? 'cover' : index === total - 1 ? 'cta' : 'content');
  const bg = solid(brand.bg, '#FFFFFF');
  const fg = solid(brand.fg, '#0B1220');
  const accent = solid(brand.accent, '#0578F5');
  const muted = solid(brand.muted, '#5B6B80');
  const font = brand.font || 'Arial';

  const isCover = kind === 'cover';
  const isCta = kind === 'cta';

  const headingSize = isCover ? 96 : isCta ? 82 : 74;
  const headingChars = estimateCharsPerLine(CONTENT_WIDTH, headingSize, 0.58);
  const heading = fitLines(slide.heading ?? brand.name, headingChars, isCover ? 4 : 3);
  const headingLine = Math.round(headingSize * 1.12);

  const bodySize = isCover ? 42 : 40;
  const bodyChars = estimateCharsPerLine(CONTENT_WIDTH, bodySize, 0.52);
  const bodyLine = Math.round(bodySize * 1.5);
  const headingTop = isCover ? 500 : 360;

  const eyebrow = (slide.eyebrow ?? (isCover ? brand.name : '')).toUpperCase();
  const warnings: string[] = [];
  if (heading.truncated) warnings.push(`slide ${index + 1}: titulo truncado`);

  const corner = bracket(PAD / 2, PAD / 2, 120, 1, accent);
  const cornerBottom = `<path d="M ${WIDTH - PAD / 2} ${HEIGHT - PAD / 2 - 120} L ${WIDTH - PAD / 2} ${HEIGHT - PAD / 2} L ${WIDTH - PAD / 2 - 120} ${HEIGHT - PAD / 2}" fill="none" stroke="${accent}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;

  const eyebrowSvg = eyebrow
    ? textBlock([eyebrow], {
        x: PAD,
        y: isCover ? 400 : 290,
        size: 28,
        color: accent,
        font,
        weight: 700,
        lineHeight: 34,
        spacing: 4,
      })
    : '';

  const logoOnCta =
    isCta && logo
      ? `<image x="${WIDTH / 2 - 130}" y="170" width="260" height="260" href="${logo}" preserveAspectRatio="xMidYMid meet"/>`
      : '';

  const headingTopActual = isCta && logo ? 500 : headingTop;

  const headingSvg = textBlock(heading.lines, {
    x: PAD,
    y: headingTopActual,
    size: headingSize,
    color: fg,
    font,
    weight: 700,
    lineHeight: headingLine,
  });

  const headingBottom = headingTopActual + heading.lines.length * headingLine;
  const accentBarY = headingBottom + 26;
  const bodyTopActual = isCover ? accentBarY + 68 : headingBottom + 48;

  const bodyBottom = isCta ? HEIGHT - PAD - 200 : HEIGHT - 200;
  const maxBodyLines = Math.max(1, Math.floor((bodyBottom - bodyTopActual) / bodyLine));
  const body = fitLines(slide.body, bodyChars, maxBodyLines);
  if (body.truncated) warnings.push(`slide ${index + 1}: corpo truncado`);

  const bodySvg = textBlock(body.lines, {
    x: PAD,
    y: bodyTopActual,
    size: bodySize,
    color: isCover ? muted : fg,
    font,
    weight: 400,
    lineHeight: bodyLine,
  });

  const accentBar = isCover
    ? `<rect x="${PAD}" y="${accentBarY}" width="120" height="10" rx="5" fill="${accent}"/>`
    : '';

  const handleSvg = textBlock([brand.handle], {
    x: PAD,
    y: HEIGHT - PAD + 6,
    size: 30,
    color: fg,
    font,
    weight: 700,
    lineHeight: 34,
  });

  const page = `${String(index + 1).padStart(2, '0')}/${String(total).padStart(2, '0')}`;
  const pageSvg = textBlock([page], {
    x: WIDTH - PAD - 70,
    y: HEIGHT - PAD + 6,
    size: 28,
    color: muted,
    font,
    weight: 400,
    lineHeight: 34,
  });

  const aiNote = post.is_ai_generated
    ? `<text x="${WIDTH - PAD}" y="80" text-anchor="end" font-family="${xmlEscape(font)}" font-size="20" font-weight="400" fill="${muted}">conteudo gerado com apoio de IA</text>`
    : '';

  const ctaLabel = isCta
    ? `<rect x="${PAD}" y="${HEIGHT - PAD - 160}" width="340" height="76" rx="38" fill="${accent}"/>` +
      textBlock(['Fale comigo'], {
        x: PAD + 44,
        y: HEIGHT - PAD - 108,
        size: 30,
        color: '#FFFFFF',
        font,
        weight: 700,
        lineHeight: 34,
      })
    : '';

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${bg}"/>
  ${corner}
  ${cornerBottom}
  ${eyebrowSvg}
  ${logoOnCta}
  ${headingSvg}
  ${accentBar}
  ${bodySvg}
  ${ctaLabel}
  ${aiNote}
  ${handleSvg}
  ${pageSvg}
</svg>`,
    warnings,
  };
}

export async function renderPost(post: Post, brand: Brand): Promise<RenderResult> {
  const slides = post.slides ?? [];
  if (slides.length === 0) {
    throw new AppError(`Post "${post.slug}" nao tem slides para renderizar.`, {
      hint: 'Adicione "slides": [{ "kind": "cover", "heading": "..." }] no JSON.',
    });
  }
  if (slides.length > 20) {
    throw new AppError('Maximo de 20 slides (limite de carrossel do Instagram).');
  }

  const dir = resolve(assetsDir, post.slug);
  await mkdir(dir, { recursive: true });

  const logo = logoDataUri(brand);
  const warnings: string[] = [];
  const files: string[] = [];

  for (let index = 0; index < slides.length; index += 1) {
    const built = buildSlideSvg({
      slide: slides[index] as Slide,
      index,
      total: slides.length,
      post,
      brand,
      logo,
    });
    warnings.push(...built.warnings);
    const file = resolve(dir, `slide-${String(index + 1).padStart(2, '0')}.jpg`);
    await sharp(Buffer.from(built.svg))
      .resize(WIDTH, HEIGHT, { fit: 'fill' })
      .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
      .toFile(file);
    files.push(file);
  }

  return { files, warnings };
}
