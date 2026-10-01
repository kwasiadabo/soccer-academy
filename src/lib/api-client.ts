import { getAcademySlug } from "./tenant";

// Mirrors the backend's own tenant-resolution exclusion (see
// AppModule#configure) — `/platform/*` is the platform-operator control
// plane, which sits above every academy and has no "current academy" to
// scope to. A visitor hitting these routes (e.g. signing up, before they
// belong to any academy at all) must never be tagged with one anyway.
function isPlatformPath(path: string): boolean {
  return path === "/platform" || path.startsWith("/platform/");
}

let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

export function getAccessToken() {
  return accessToken;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

async function rawRequest(path: string, options: RequestOptions = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (!isPlatformPath(path)) headers.set("X-Academy-Slug", getAcademySlug());
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: "include",
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

export interface RefreshResult {
  success: boolean;
  // Which academy the restored session actually belongs to — present
  // whenever `success` is true. With COOKIE_DOMAIN sharing the refresh
  // cookie across subdomains, this can come back as the bare root domain's
  // response to a cookie that was issued on (and still belongs to) one
  // specific academy's own subdomain, so a caller can't just assume it
  // matches whatever academy the current page already thinks it's on.
  academySlug: string | null;
}

// The refresh token rotates on every call, so two concurrent refreshes (e.g. several
// React Query requests hitting a 401 at once) would race: whichever loses presents a
// token the winner already rotated away, which the backend's reuse-detection treats as
// theft and revokes the whole session. Sharing one in-flight request keeps concurrent
// callers from ever racing each other.
let refreshInFlight: Promise<RefreshResult> | null = null;

export async function tryRefresh(): Promise<RefreshResult> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
          headers: { "X-Academy-Slug": getAcademySlug() },
        });
        if (!res.ok) return { success: false, academySlug: null };
        const data = (await res.json()) as { accessToken: string; academySlug: string };
        setAccessToken(data.accessToken);
        return { success: true, academySlug: data.academySlug };
      } catch {
        return { success: false, academySlug: null };
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await rawRequest(path, options);

  if (res.status === 401 && path !== "/auth/login") {
    const { success } = await tryRefresh();
    if (success) {
      res = await rawRequest(path, options);
    } else {
      onSessionExpired?.();
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    const message = Array.isArray(body.message) ? body.message.join(", ") : body.message;
    throw new ApiError(res.status, message ?? "Request failed");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};

async function rawUpload(path: string, formData: FormData): Promise<Response> {
  const headers = new Headers();
  if (!isPlatformPath(path)) headers.set("X-Academy-Slug", getAcademySlug());
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return fetch(`/api${path}`, { method: "POST", headers, credentials: "include", body: formData });
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  let res = await rawUpload(path, formData);

  if (res.status === 401) {
    const { success } = await tryRefresh();
    res = success ? await rawUpload(path, formData) : res;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? "Upload failed");
  }

  return (await res.json()) as T;
}

export async function fetchAuthorizedBlob(path: string): Promise<Blob> {
  const headers = new Headers();
  if (!isPlatformPath(path)) headers.set("X-Academy-Slug", getAcademySlug());
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  let res = await fetch(`/api${path}`, { headers, credentials: "include" });

  if (res.status === 401) {
    const { success } = await tryRefresh();
    if (success) {
      if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
      res = await fetch(`/api${path}`, { headers, credentials: "include" });
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, "Could not load image");
  }

  return res.blob();
}
