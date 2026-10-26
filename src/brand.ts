import { existsSync, readFileSync } from 'node:fs';
import { brandFile } from './paths.js';

export interface Brand {
  name: string;
  handle: string;
  bg: string;
  fg: string;
  accent: string;
  muted: string;
  font: string;
  logoFile?: string;
}

const DEFAULTS: Brand = {
  name: 'W-Tec',
  handle: '@w_tec',
  bg: '#FFFFFF',
  fg: '#0B1220',
  accent: '#0578F5',
  muted: '#5B6B80',
  font: 'Arial',
  logoFile: 'logo_wtec.jpg',
};

function visualBlock(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => /^##\s+visual\b/i.test(line));
  if (start === -1) return [];
  const block: string[] = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    if (/^##\s+/.test(line)) break;
    block.push(line);
  }
  return block;
}

export function parseBrand(markdown: string): Brand {
  const brand: Brand = { ...DEFAULTS };
  for (const line of visualBlock(markdown)) {
    const match = /^\s*([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.+?)\s*$/.exec(line);
    if (!match) continue;
    const key = (match[1] ?? '').toLowerCase();
    const value = match[2] ?? '';
    if (key === 'bg') brand.bg = value;
    else if (key === 'fg') brand.fg = value;
    else if (key === 'accent') brand.accent = value;
    else if (key === 'muted') brand.muted = value;
    else if (key === 'font') brand.font = value;
    else if (key === 'handle') brand.handle = value;
    else if (key === 'logo') brand.logoFile = value;
    else if (key === 'name') brand.name = value;
  }

  const nameMatch = /^-\s*Nome:\s*(.+)$/m.exec(markdown);
  if (nameMatch?.[1]) brand.name = nameMatch[1].trim();
  const handleMatch = /^-\s*Handle:\s*(.+)$/m.exec(markdown);
  if (handleMatch?.[1]) brand.handle = handleMatch[1].trim();

  return brand;
}

export function loadBrand(): Brand {
  if (!existsSync(brandFile)) return { ...DEFAULTS };
  return parseBrand(readFileSync(brandFile, 'utf8'));
}
