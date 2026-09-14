// A separate client for the platform-operator control plane (/api/platform/*).
// Deliberately does not share state with lib/api-client.ts: the platform admin
// JWT is signed with its own secret and carries no academyId, so it must never
// be sent as (or confused with) an academy user's Authorization header. There
// is also no refresh-cookie flow on the backend for this actor type (see
// PlatformAdminService#login) — a 401 here just ends the session.
const STORAGE_KEY = "sams-platform-admin-token";

let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export function setPlatformAccessToken(token: string | null) {
  accessToken = token;
  try {
    if (token) sessionStorage.setItem(STORAGE_KEY, token);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Session-only convenience — fine to no-op if storage is unavailable.
  }
}

export function getStoredPlatformAccessToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setPlatformSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

export class PlatformApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "PlatformApiError";
    this.status = status;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

async function platformRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const res = await fetch(`/api/platform${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401 && path !== "/auth/login") {
    onSessionExpired?.();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    const message = Array.isArray(body.message) ? body.message.join(", ") : body.message;
    throw new PlatformApiError(res.status, message ?? "Request failed");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export const platformApi = {
  get: <T>(path: string) => platformRequest<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => platformRequest<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => platformRequest<T>(path, { method: "PATCH", body }),
};
