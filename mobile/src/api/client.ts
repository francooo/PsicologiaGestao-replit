import { API_URL } from '@/config';

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

/** Called when an authenticated request gets 401 (expired/revoked session). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

export function apiUrl(path: string) {
  return path.startsWith('http') ? path : `${API_URL}${path}`;
}

export function authHeaders(): Record<string, string> {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
};

function buildQuery(query?: RequestOptions['query']) {
  if (!query) return '';
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return params.length ? `?${params.join('&')}` : '';
}

async function parseError(res: Response) {
  let body: any;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }
  const message =
    (body && typeof body === 'object' && (body.message || body.error)) ||
    (typeof body === 'string' && body) ||
    res.statusText ||
    'Erro na requisição';
  return new ApiError(res.status, String(message), body);
}

/** JSON request to the ConsultaPsi API (Bearer session token). */
export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query } = options;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

  const res = await fetch(apiUrl(path) + buildQuery(query), {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...authHeaders(),
    },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await parseError(res);
    // A 401 about the Google connection (meetings, care e-mails) is not our session expiring
    const googleError = /google/i.test(error.message) || (error.body as any)?.error === 'GOOGLE_TOKEN_EXPIRED';
    if (res.status === 401 && authToken && onUnauthorized && !googleError) onUnauthorized();
    throw error;
  }
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}
