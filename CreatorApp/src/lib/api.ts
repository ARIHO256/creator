import { invalidateAuthSession } from "./authSession";

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | unknown[] | null;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: {
    message?: string;
    statusCode?: number;
  };
};

const RAW_API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as ImportMeta).env?.VITE_API_URL) || "/api";

const API_BASE = RAW_API_BASE.replace(/\/+$/, "");
const pendingGetRequests = new Map<string, Promise<unknown>>();

function buildUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (API_BASE.endsWith("/api") && normalizedPath.startsWith("/api/")) {
    return `${API_BASE}${normalizedPath.slice(4)}`;
  }
  return `${API_BASE}${normalizedPath}`;
}

function isJsonBody(body: RequestOptions["body"]) {
  if (body == null) return false;
  if (typeof body === "string") return false;
  if (body instanceof FormData) return false;
  if (body instanceof URLSearchParams) return false;
  if (body instanceof Blob) return false;
  if (body instanceof ArrayBuffer) return false;
  return true;
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const envelope = payload as ApiEnvelope<unknown>;
  if (envelope.error?.message) return envelope.error.message;
  if (typeof (payload as { message?: unknown }).message === "string") {
    return (payload as { message: string }).message;
  }
  return fallback;
}

function shouldInvalidateSession(path: string, status: number) {
  if (status !== 401) return false;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (normalizedPath === "/auth/me") return true;
  if (normalizedPath.startsWith("/auth/login")) return false;
  if (normalizedPath.startsWith("/auth/register")) return false;
  if (normalizedPath.startsWith("/auth/logout")) return false;
  return true;
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = String(options.method ?? "GET").toUpperCase();
  const requestUrl = buildUrl(path);
  const requestKey = `${method}:${requestUrl}`;

  const runRequest = async () => {
    const headers = new Headers(options.headers ?? {});
    const body = options.body;

    if (isJsonBody(body) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(requestUrl, {
      ...options,
      credentials: "include",
      headers,
      body: isJsonBody(body) ? JSON.stringify(body) : (body as BodyInit | null | undefined)
    });

    const payload = await parseResponse(response);

    if (!response.ok) {
      if (shouldInvalidateSession(path, response.status)) {
        invalidateAuthSession();
      }

      throw new ApiError(
        extractErrorMessage(payload, `Request failed with status ${response.status}`),
        response.status,
        payload
      );
    }

    if (payload && typeof payload === "object" && "success" in (payload as Record<string, unknown>)) {
      const envelope = payload as ApiEnvelope<T>;
      if (envelope.success === false) {
        throw new ApiError(
          extractErrorMessage(payload, "Request failed"),
          envelope.error?.statusCode ?? response.status,
          payload
        );
      }
      return (envelope.data ?? null) as T;
    }

    return payload as T;
  };

  if (method === "GET") {
    const pending = pendingGetRequests.get(requestKey);
    if (pending) {
      return pending as Promise<T>;
    }

    const nextRequest = runRequest().finally(() => {
      pendingGetRequests.delete(requestKey);
    });

    pendingGetRequests.set(requestKey, nextRequest as Promise<unknown>);
    return nextRequest;
  }

  return runRequest();
}

export const api = {
  get<T>(path: string, options?: Omit<RequestOptions, "body" | "method">) {
    return request<T>(path, { ...options, method: "GET" });
  },
  post<T>(path: string, body?: RequestOptions["body"], options?: Omit<RequestOptions, "body" | "method">) {
    return request<T>(path, { ...options, method: "POST", body });
  },
  patch<T>(path: string, body?: RequestOptions["body"], options?: Omit<RequestOptions, "body" | "method">) {
    return request<T>(path, { ...options, method: "PATCH", body });
  },
  delete<T>(path: string, options?: Omit<RequestOptions, "body" | "method">) {
    return request<T>(path, { ...options, method: "DELETE" });
  }
};
