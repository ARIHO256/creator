type ApiRuntime = { mode: "live"; baseUrl: string };

const env = (import.meta as ImportMeta & {
  env?: { DEV?: boolean; VITE_API_BASE_URL?: string };
}).env;

const EXPLICIT_API_BASE_URL = String(env?.VITE_API_BASE_URL || "").replace(/\/+$/, "");
let runtimePromise: Promise<ApiRuntime> | null = null;

async function detectRuntime(): Promise<ApiRuntime> {
  if (EXPLICIT_API_BASE_URL) {
    return { mode: "live", baseUrl: EXPLICIT_API_BASE_URL };
  }

  if (!env?.DEV) {
    return { mode: "live", baseUrl: "" };
  }
  return { mode: "live", baseUrl: "" };
}

export async function resolveApiRuntime(): Promise<ApiRuntime> {
  if (!runtimePromise) {
    runtimePromise = detectRuntime();
  }
  return runtimePromise;
}

export async function resolveApiUrl(path: string) {
  const runtime = await resolveApiRuntime();
  return `${runtime.baseUrl}${path}`;
}
