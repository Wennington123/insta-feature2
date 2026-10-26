import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));

export const repoRoot = resolve(here, '..');
export const contentDir = resolve(repoRoot, 'content');
export const postsDir = resolve(contentDir, 'posts');
export const assetsDir = resolve(contentDir, 'assets');
export const outDir = resolve(repoRoot, 'out');
export const previewDir = resolve(outDir, 'preview');
export const publishedFile = resolve(contentDir, 'published.jsonl');
export const lockFile = resolve(contentDir, '.due.lock');
export const envFile = resolve(repoRoot, '.env');
export const brandFile = resolve(repoRoot, 'brand.md');
export const skillsDir = resolve(repoRoot, 'skills');

export function userConfigDir(): string {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA ?? resolve(homedir(), 'AppData', 'Roaming');
    return resolve(appData, 'ig-agent');
  }
  const xdg = process.env.XDG_CONFIG_HOME ?? resolve(homedir(), '.config');
  return resolve(xdg, 'ig-agent');
}

export function userConfigFile(): string {
  return resolve(userConfigDir(), 'config.json');
}
