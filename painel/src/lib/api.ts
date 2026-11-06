export const API_URL = String(import.meta.env.VITE_API_URL || "https://gestaoparaclinicas.vercel.app").replace(/\/+$/, "");

const TOKEN_KEY = "painel_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked: the session lasts until the tab closes */
  }
}

export class ApiError extends Error {
  status: number;
  field?: string;
  constructor(status: number, message: string, field?: string) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getToken();
  if (token && init.auth !== false) headers.Authorization = `Bearer ${token}`;
  if (init.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Não foi possível falar com o servidor. Verifique a conexão.");
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    if (res.status === 401 && init.auth !== false) {
      setToken(null);
      window.dispatchEvent(new Event("painel:unauthorized"));
    }
    const fallback =
      res.status === 401 ? "Sessão expirada. Entre novamente." :
      res.status === 403 ? "Você não tem permissão para esta ação." :
      `Erro ${res.status} ao falar com o servidor.`;
    throw new ApiError(res.status, data?.message || fallback, data?.field);
  }
  return data as T;
}

export function qs(params: Record<string, string | undefined | null>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}
