import { existsSync, readFileSync } from 'node:fs';
import { envFile, userConfigFile } from './paths.js';
import { AppError } from './errors.js';

export interface Config {
  userId: string;
  accessToken: string;
  host: string;
  apiVersion: string;
  mediaBaseUrl?: string;
  machine?: string;
}

type RawConfig = Record<string, string | undefined>;

let envLoaded = false;

export function loadEnv(): void {
  if (envLoaded) return;
  envLoaded = true;
  if (!existsSync(envFile)) return;

  const text = readFileSync(envFile, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1] as string;
    let value = (match[2] ?? '').trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function readUserConfig(): RawConfig {
  if (!existsSync(userConfigFile())) return {};
  try {
    const parsed: unknown = JSON.parse(readFileSync(userConfigFile(), 'utf8'));
    if (!parsed || typeof parsed !== 'object') return {};
    const out: RawConfig = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string') out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export function hasConfig(): boolean {
  loadEnv();
  return Boolean(process.env.IG_ACCESS_TOKEN && process.env.IG_USER_ID);
}

export function readConfig(): Config {
  loadEnv();
  const fallback = readUserConfig();
  const get = (key: string): string | undefined => process.env[key] ?? fallback[key];
  const userId = get('IG_USER_ID');
  const accessToken = get('IG_ACCESS_TOKEN');

  if (!accessToken) {
    throw new AppError('IG_ACCESS_TOKEN nao configurado.', {
      hint: 'Copie .env.example para .env e cole o token, ou rode `ig auth set`.',
    });
  }
  if (!userId) {
    throw new AppError('IG_USER_ID nao configurado.', {
      hint: 'Rode `ig auth check` para descobrir o user_id da conta e grave em .env.',
    });
  }

  return {
    userId,
    accessToken,
    host: get('IG_API_HOST') ?? 'graph.instagram.com',
    apiVersion: get('IG_API_VERSION') ?? 'v26.0',
    mediaBaseUrl: get('IG_MEDIA_BASE_URL') || undefined,
    machine: get('IG_MACHINE') || undefined,
  };
}

export function readConfigSafe(): Config | undefined {
  try {
    return readConfig();
  } catch {
    return undefined;
  }
}
