import { AppError } from '../errors.js';
import { maskToken } from '../log.js';

export type FetchImpl = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface GraphClientOptions {
  token: string;
  userId: string;
  host?: string;
  version?: string;
  fetchImpl?: FetchImpl;
  sleep?: (ms: number) => Promise<void>;
  retries?: number;
}

export interface RequestPlan {
  method: 'GET' | 'POST';
  url: string;
  body?: string;
}

interface GraphErrorPayload {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
  error_user_msg?: string;
  error_user_title?: string;
}

export class GraphError extends AppError {
  readonly code?: number;
  readonly subcode?: number;
  readonly fbtraceId?: string;
  readonly httpStatus: number;

  constructor(
    message: string,
    options: {
      hint?: string;
      code?: number;
      subcode?: number;
      fbtraceId?: string;
      httpStatus: number;
    },
  ) {
    super(message, { hint: options.hint });
    this.name = 'GraphError';
    this.code = options.code;
    this.subcode = options.subcode;
    this.fbtraceId = options.fbtraceId;
    this.httpStatus = options.httpStatus;
  }
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function hintFor(payload: GraphErrorPayload | undefined, httpStatus: number): string | undefined {
  if (httpStatus === 401 || payload?.code === 190) {
    return 'Token invalido ou expirado. Rode `ig auth refresh` ou gere um novo token no painel da Meta.';
  }
  if (httpStatus === 429 || payload?.code === 4 || payload?.code === 17 || payload?.code === 613) {
    return 'Limite de chamadas da API atingido. Aguarde alguns minutos e tente de novo.';
  }
  if (payload?.code === 100) {
    return 'Parametro invalido. Confira IG_USER_ID, o tipo de midia e os campos do post.';
  }
  if (payload?.code === 9004 || payload?.code === 36000 || payload?.code === 2207052) {
    return 'A Meta nao conseguiu baixar a midia. A URL precisa ser publica, HTTPS e devolver o arquivo direto.';
  }
  if (payload?.code === 36003 || payload?.code === 36001) {
    return 'Midia rejeitada: confira formato (JPEG), proporcao, tamanho e duracao.';
  }
  return undefined;
}

function extractErrorPayload(json: unknown): GraphErrorPayload | undefined {
  if (!json || typeof json !== 'object') return undefined;
  const maybe = (json as { error?: unknown }).error;
  if (!maybe || typeof maybe !== 'object') return undefined;
  const error = maybe as Record<string, unknown>;
  return {
    message: typeof error.message === 'string' ? error.message : undefined,
    type: typeof error.type === 'string' ? error.type : undefined,
    code: typeof error.code === 'number' ? error.code : undefined,
    error_subcode: typeof error.error_subcode === 'number' ? error.error_subcode : undefined,
    fbtrace_id: typeof error.fbtrace_id === 'string' ? error.fbtrace_id : undefined,
    error_user_msg: typeof error.error_user_msg === 'string' ? error.error_user_msg : undefined,
    error_user_title: typeof error.error_user_title === 'string' ? error.error_user_title : undefined,
  };
}

function isRetriable(status: number, payload: GraphErrorPayload | undefined): boolean {
  if (status === 429 || status >= 500) return true;
  return payload?.code === 2 || payload?.code === 4;
}

export class GraphClient {
  readonly userId: string;
  readonly host: string;
  readonly version: string;
  private readonly token: string;
  private readonly fetchImpl: FetchImpl;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly retries: number;

  constructor(options: GraphClientOptions) {
    this.userId = options.userId;
    this.host = options.host ?? 'graph.instagram.com';
    this.version = options.version ?? 'v26.0';
    this.token = options.token;
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    this.sleep = options.sleep ?? defaultSleep;
    this.retries = options.retries ?? 3;
  }

  baseUrl(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `https://${this.host}/${this.version}${normalized}`;
  }

  /** URL sem versao, usada por endpoints como /refresh_access_token. */
  rootUrl(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `https://${this.host}${normalized}`;
  }

  private encode(params: Record<string, string | undefined>): [string, string][] {
    return Object.entries(params)
      .filter((entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== '')
      .map(([key, value]) => [key, value]);
  }

  /** Monta o request sem executar, para `--dry-run`. Token sempre mascarado. */
  plan(method: 'GET' | 'POST', path: string, params: Record<string, string | undefined> = {}): RequestPlan {
    const entries = this.encode({ ...params, access_token: this.token });
    const masked = entries.map(([key, value]) => [
      key,
      key === 'access_token' ? maskToken(value) : value,
    ]) as [string, string][];

    if (method === 'GET') {
      const url = new URL(this.baseUrl(path));
      for (const [key, value] of masked) url.searchParams.set(key, value);
      return { method, url: url.toString() };
    }

    const body = new URLSearchParams(masked).toString();
    return { method, url: this.baseUrl(path), body };
  }

  async get<T>(path: string, params: Record<string, string | undefined> = {}): Promise<T> {
    return this.request<T>('GET', path, params);
  }

  async post<T>(path: string, params: Record<string, string | undefined> = {}): Promise<T> {
    return this.request<T>('POST', path, params);
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    params: Record<string, string | undefined>,
  ): Promise<T> {
    const entries = this.encode(params);
    const url = new URL(this.baseUrl(path));
    let body: string | undefined;

    if (method === 'GET') {
      for (const [key, value] of entries) url.searchParams.set(key, value);
      url.searchParams.set('access_token', this.token);
    } else {
      const form = new URLSearchParams(entries);
      form.set('access_token', this.token);
      body = form.toString();
    }

    let attempt = 0;
    for (;;) {
      let response: Response;
      try {
        response = await this.fetchImpl(url.toString(), {
          method,
          headers: method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
          body,
          signal: AbortSignal.timeout(30_000),
        });
      } catch (networkError) {
        if (attempt < this.retries) {
          await this.sleep(500 * 2 ** attempt);
          attempt += 1;
          continue;
        }
        const detail = networkError instanceof Error ? networkError.message : String(networkError);
        throw new AppError(`Falha de rede ao chamar a API da Meta: ${detail}`, {
          hint: 'Verifique a conexao e tente novamente.',
        });
      }

      const text = await response.text();
      let json: unknown = {};
      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          json = { raw: text };
        }
      }

      if (response.ok) return json as T;

      const payload = extractErrorPayload(json);
      if (isRetriable(response.status, payload) && attempt < this.retries) {
        await this.sleep(500 * 2 ** attempt);
        attempt += 1;
        continue;
      }

      const message =
        payload?.error_user_msg ??
        payload?.message ??
        `A API respondeu HTTP ${response.status} sem detalhes.`;
      throw new GraphError(message, {
        hint: hintFor(payload, response.status),
        code: payload?.code,
        subcode: payload?.error_subcode,
        fbtraceId: payload?.fbtrace_id,
        httpStatus: response.status,
      });
    }
  }
}
