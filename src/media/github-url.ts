import { execFileSync } from 'node:child_process';
import { relative, resolve, sep } from 'node:path';

import { repoRoot } from '../paths.js';

export interface GitHubRemote {
  owner: string;
  repo: string;
}

export function parseGitHubRemote(remote: string): GitHubRemote | null {
  const patterns = [
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i,
    /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i,
    /^ssh:\/\/git@github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(remote.trim());
    if (match?.[1] && match[2]) return { owner: match[1], repo: match[2] };
  }
  return null;
}

function git(args: string[], cwd = repoRoot): string | null {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

export function originRemote(): GitHubRemote | null {
  const remote = git(['remote', 'get-url', 'origin']);
  return remote ? parseGitHubRemote(remote) : null;
}

export function currentBranch(): string {
  return process.env.IG_BRANCH?.trim() || git(['rev-parse', '--abbrev-ref', 'HEAD']) || 'main';
}

export function repoRelativePath(absPath: string): string {
  return relative(repoRoot, absPath).split(sep).join('/');
}

function encodePath(path: string): string {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

/**
 * Resolve a URL publica de um asset.
 * Prioridade: IG_MEDIA_BASE_URL > GitHub raw do remoto origin.
 */
export function resolveMediaUrl(absPath: string, mediaBaseUrl?: string): string | null {
  const rel = repoRelativePath(absPath);
  if (rel.startsWith('..')) return null;

  if (mediaBaseUrl) {
    return `${mediaBaseUrl.replace(/\/+$/, '')}/${encodePath(rel)}`;
  }

  const origin = originRemote();
  if (!origin) return null;
  return `https://raw.githubusercontent.com/${origin.owner}/${origin.repo}/${currentBranch()}/${encodePath(rel)}`;
}

export function mediaUrlFor(relPath: string, mediaBaseUrl?: string): string | null {
  return resolveMediaUrl(resolve(repoRoot, relPath), mediaBaseUrl);
}
