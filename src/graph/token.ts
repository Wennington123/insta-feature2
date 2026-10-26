import { AppError } from '../errors.js';
import { GraphClient } from './client.js';

export async function refreshLongLivedToken(
  client: GraphClient,
  token: string,
): Promise<{ accessToken: string; expiresIn?: number }> {
  const url = new URL(client.rootUrl('/refresh_access_token'));
  url.searchParams.set('grant_type', 'ig_refresh_token');
  url.searchParams.set('access_token', token);

  const response = await fetch(url.toString(), { method: 'GET', signal: AbortSignal.timeout(30_000) });
  const text = await response.text();
  let json: unknown = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = {};
    }
  }

  if (!response.ok) {
    const detail = (json as { error?: { message?: string } }).error?.message;
    throw new AppError(`Nao foi possivel renovar o token: ${detail ?? `HTTP ${response.status}`}`, {
      hint: 'Gere um novo token no painel da Meta se o atual ja expirou (validade de 60 dias).',
    });
  }

  const accessToken = (json as { access_token?: string }).access_token;
  if (!accessToken) {
    throw new AppError('A Meta nao retornou access_token na renovacao.');
  }
  return {
    accessToken,
    expiresIn: (json as { expires_in?: number }).expires_in,
  };
}
