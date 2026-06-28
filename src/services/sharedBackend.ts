const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? "";

export const SHARED_BACKEND_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function baseHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

async function sharedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!SHARED_BACKEND_ENABLED) throw new Error("Shared backend is not configured.");
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1${path}`, {
    ...init,
    headers: {
      ...baseHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Shared backend ${response.status}: ${detail || path}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function q(value: string) {
  return encodeURIComponent(value);
}

export async function sharedSelect<T>(table: string, query = "*", filter = ""): Promise<T[]> {
  return sharedRequest<T[]>(`/${table}?select=${q(query)}${filter ? `&${filter}` : ""}`, { method: "GET" });
}

export async function sharedSelectOne<T>(table: string, query = "*", filter = ""): Promise<T | null> {
  const rows = await sharedRequest<T[]>(
    `/${table}?select=${q(query)}${filter ? `&${filter}` : ""}&limit=1`,
    { method: "GET" },
  );
  return rows[0] ?? null;
}

export async function sharedInsert<T>(table: string, rows: Record<string, unknown> | Record<string, unknown>[]): Promise<T[]> {
  return sharedRequest<T[]>(`/${table}`, {
    method: "POST",
    body: JSON.stringify(rows),
  });
}

export async function sharedUpdate<T>(table: string, filter: string, patch: Record<string, unknown>): Promise<T[]> {
  return sharedRequest<T[]>(`/${table}?${filter}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function sharedDelete<T>(table: string, filter: string): Promise<T[]> {
  return sharedRequest<T[]>(`/${table}?${filter}`, {
    method: "DELETE",
  });
}

export function sharedBackendUrl() {
  return SUPABASE_URL;
}
