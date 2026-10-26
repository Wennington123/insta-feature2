import type { FetchImpl } from '../graph/client.js';
import { LIMITS } from '../content/rules.js';

export interface MediaCheck {
  ok: boolean;
  url: string;
  status?: number;
  contentType?: string;
  bytes?: number;
  problems: string[];
  warnings: string[];
}

export interface MediaCheckOptions {
  expect?: 'image' | 'video';
  fetchImpl?: FetchImpl;
  timeoutMs?: number;
}

const HTML_HINT =
  'A URL devolveu HTML em vez do arquivo. Normalmente significa 404, repositorio privado ou link de compartilhamento (Drive/Dropbox).';

export async function checkPublicMedia(
  url: string,
  options: MediaCheckOptions = {},
): Promise<MediaCheck> {
  const fetchImpl: FetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const expect = options.expect ?? 'image';
  const result: MediaCheck = { ok: false, url, problems: [], warnings: [] };

  if (!/^https:\/\//i.test(url)) {
    result.problems.push('A Meta exige URL HTTPS publica.');
    return result;
  }

  let response: Response | undefined;
  try {
    response = await fetchImpl(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(options.timeoutMs ?? 20_000),
    });
  } catch {
    response = undefined;
  }

  const headMissingType =
    !response ||
    response.status === 403 ||
    response.status === 405 ||
    response.status === 501 ||
    !response.headers.get('content-type');

  if (headMissingType) {
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-2047' },
        redirect: 'follow',
        signal: AbortSignal.timeout(options.timeoutMs ?? 20_000),
      });
    } catch (error) {
      result.problems.push(
        `Nao foi possivel acessar a URL: ${error instanceof Error ? error.message : String(error)}`,
      );
      return result;
    }
  }

  if (!response) {
    result.problems.push('Nao foi possivel acessar a URL.');
    return result;
  }

  result.status = response.status;
  const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
  result.contentType = contentType || undefined;

  if (!response.ok && response.status !== 206) {
    result.problems.push(`A URL respondeu HTTP ${response.status}. A Meta nao conseguira baixar.`);
    return result;
  }

  if (contentType.includes('text/html')) {
    result.problems.push(HTML_HINT);
    return result;
  }

  if (!contentType) {
    result.warnings.push('A URL nao informou Content-Type; confirme que e o arquivo direto.');
  } else if (expect === 'image') {
    if (!contentType.includes('image/jpeg')) {
      result.problems.push(
        `Content-Type "${contentType}". A Meta aceita somente JPEG em imagens; converta antes de publicar.`,
      );
    }
  } else if (!/video\/(mp4|quicktime)/.test(contentType)) {
    result.problems.push(`Content-Type "${contentType}". Use video MP4 (H.264) ou MOV.`);
  }

  const lengthHeader = response.headers.get('content-length');
  if (lengthHeader) {
    const bytes = Number(lengthHeader);
    if (Number.isFinite(bytes)) {
      result.bytes = bytes;
      const max = expect === 'image' ? LIMITS.imageMaxBytes : LIMITS.videoMaxBytes;
      if (bytes > max) {
        result.problems.push(`Arquivo com ${(bytes / 1024 / 1024).toFixed(1)} MB; maximo ${max / 1024 / 1024} MB.`);
      }
    }
  } else {
    result.warnings.push('Sem Content-Length; o tamanho nao pode ser verificado com HEAD.');
  }

  result.ok = result.problems.length === 0;
  return result;
}

export function expectedKind(url: string): 'image' | 'video' {
  return /\.(mp4|mov|m4v)(\?.*)?$/i.test(url) ? 'video' : 'image';
}
