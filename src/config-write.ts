import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { envFile } from './paths.js';

const HEADER = `# Instagram API with Instagram Login (graph.instagram.com)
`;

export function updateEnvFile(updates: Record<string, string>): string[] {
  let lines: string[] = [];
  if (existsSync(envFile)) {
    lines = readFileSync(envFile, 'utf8').split(/\r?\n/);
  }

  const changed: string[] = [];
  for (const [key, value] of Object.entries(updates)) {
    const index = lines.findIndex((line) => new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`).test(line));
    const next = `${key}=${value}`;
    if (index === -1) {
      lines.push(next);
    } else if (lines[index] !== next) {
      lines[index] = next;
    } else {
      continue;
    }
    changed.push(key);
  }

  const text = lines.join('\n').replace(/\n{3,}/g, '\n\n');
  writeFileSync(envFile, text.endsWith('\n') ? text : `${text}\n`, 'utf8');
  return changed;
}

export function createEnvFile(content: string): boolean {
  if (existsSync(envFile)) return false;
  writeFileSync(envFile, content.startsWith('#') ? content : `${HEADER}${content}`, 'utf8');
  return true;
}
