type ApiRuntime =
  | { mode: "live"; baseUrl: string }
  | { mode: "mock" };

const env = (import.meta as ImportMeta & {
  env?: { DEV?: boolean; VITE_API_BASE_URL?: string; VITE_LOCAL_API_MODE?: string };
}).env;

const EXPLICIT_API_BASE_URL = String(env?.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const DEV_BACKEND_ORIGIN = "http://127.0.0.1:4010";
const DEV_API_MODE = String(env?.VITE_LOCAL_API_MODE || "auto").toLowerCase();

let runtimePromise: Promise<ApiRuntime> | null = null;

async function probeDevBackend() {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeout = globalThis.setTimeout(() => controller?.abort(), 350);

  try {
    const response = await fetch(`${DEV_BACKEND_ORIGIN}/health`, {
      method: "GET",
      signal: controller?.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function detectRuntime(): Promise<ApiRuntime> {
  if (EXPLICIT_API_BASE_URL) {
    return { mode: "live", baseUrl: EXPLICIT_API_BASE_URL };
  }

  if (!env?.DEV) {
    return { mode: "live", baseUrl: "" };
  }

  if (DEV_API_MODE === "mock") {
    return { mode: "mock" };
  }

  if (DEV_API_MODE === "live") {
    return { mode: "live", baseUrl: "" };
  }

  const backendAvailable = await probeDevBackend();
  return backendAvailable
    ? { mode: "live", baseUrl: "" }
    : { mode: "mock" };
}

export async function resolveApiRuntime(): Promise<ApiRuntime> {
  if (!runtimePromise) {
    runtimePromise = detectRuntime();
  }
  return runtimePromise;
}

export async function resolveApiUrl(path: string) {
  const runtime = await resolveApiRuntime();
  if (runtime.mode === "mock") {
    return null;
  }
  return `${runtime.baseUrl}${path}`;
}
