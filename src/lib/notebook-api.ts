/**
 * API client for the Legion Hutta Python backend.
 *
 * The backend runs on port 8000. In dev (`next dev`), Next.js `rewrites`
 * in next.config.ts forward same-origin /api/{health,kernels,kernelspecs,v1}
 * to localhost:8000 — so the browser calls /api/foo?XTransformPort=8000
 * and Next.js rewrites it. The `XTransformPort=8000` query param is also
 * honoured by the production gateway.
 *
 * For server-side calls (Next.js route handlers), relative URLs don't
 * work — we need an absolute origin. `backendBaseUrl()` returns the
 * right origin depending on whether we're in the browser or in a
 * Node server worker.
 */

import type {
  ExecutionResult,
  KernelInfo,
  KernelspecsResponse,
  KernelSpec,
  OutputChunk,
} from "@/types/notebook";

const BACKEND_PORT = "8000";
const BACKEND_HOST = process.env.LEGION_BACKEND_HOST ?? "localhost";
const BACKEND_ORIGIN = `http://${BACKEND_HOST}:${BACKEND_PORT}`;

export function backendUrl(path: string, extra: Record<string, string> = {}): string {
  const search = new URLSearchParams({ XTransformPort: BACKEND_PORT, ...extra });
  // In the browser, use a same-origin relative URL — the gateway / Next.js
  // rewrite will route it. On the server (Node route handler), use an
  // absolute URL so fetch() doesn't fail with "Invalid URL".
  const prefix = typeof window !== "undefined" ? "" : BACKEND_ORIGIN;
  return `${prefix}${path}?${search.toString()}`;
}

export async function backendFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(backendUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore parse error
    }
    throw new Error(`API ${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

// Internal alias for backwards compatibility within this file.
async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return backendFetch<T>(path, init);
}

export const api = {
  health: () =>
    jsonFetch<{ status: string; service: string; team: string; kernels_running: number }>(
      "/api/health",
    ),

  listKernelspecs: () => jsonFetch<KernelspecsResponse>("/api/kernelspecs"),

  listSandboxes: () =>
    jsonFetch<{
      sandboxes: Array<{
        name: string;
        display_name: string;
        description: string;
        icon: string;
        requires_api_key: boolean;
        api_key_env_var: string | null;
        docs_url: string | null;
        available: boolean;
        unavailable_reason: string | null;
      }>;
    }>("/api/sandboxes"),

  listKernels: () => jsonFetch<{ kernels: KernelInfo[] }>("/api/kernels"),

  createKernel: (name: string = "python3", sandbox: string = "local") =>
    jsonFetch<KernelInfo>("/api/kernels", {
      method: "POST",
      body: JSON.stringify({ name, sandbox }),
    }),

  getKernel: (id: string) => jsonFetch<KernelInfo>(`/api/kernels/${id}`),

  shutdownKernel: (id: string) =>
    jsonFetch<{ ok: boolean; kernel_id: string }>(`/api/kernels/${id}`, {
      method: "DELETE",
    }),

  interruptKernel: (id: string) =>
    jsonFetch<KernelInfo>(`/api/kernels/${id}/interrupt`, { method: "POST" }),

  restartKernel: (id: string) =>
    jsonFetch<KernelInfo>(`/api/kernels/${id}/restart`, { method: "POST" }),

  /** Variables inspector — returns the kernel's globals. */
  getVariables: (id: string) =>
    jsonFetch<{
      variables: Array<{
        name: string;
        type: string;
        repr: string;
        size: number;
      }>;
    }>(`/api/kernels/${id}/variables`),

  /** Non-streaming execute — returns the aggregated result. */
  execute: (kernelId: string, code: string) =>
    jsonFetch<ExecutionResult>(`/api/kernels/${kernelId}/execute`, {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  /**
   * Streaming execute — calls the SSE endpoint and yields output
   * chunks as they arrive. Returns a final summary object as the
   * last yielded value with `type === "done"`.
   */
  executeStream: async function* (
    kernelId: string,
    code: string,
    signal?: AbortSignal,
  ): AsyncGenerator<
    | ({ kind: "chunk" } & OutputChunk)
    | ({ kind: "done" } & ExecutionResult)
  > {
    const res = await fetch(backendUrl(`/api/kernels/${kernelId}/execute/stream`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
      signal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`Stream failed: ${res.status} ${res.statusText}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE events are separated by blank lines
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) >= 0) {
        const rawEvent = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const lines = rawEvent.split("\n");
        let event = "message";
        let data = "";
        for (const line of lines) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) data += line.slice(5).trim();
        }
        if (!data) continue;
        try {
          const parsed = JSON.parse(data);
          if (event === "done") {
            yield { kind: "done", ...(parsed as ExecutionResult) };
          } else {
            yield { kind: "chunk", ...(parsed as OutputChunk) };
          }
        } catch {
          // ignore malformed event
        }
      }
    }
  },
};

export type Api = typeof api;

export function getKernelSpecByMode(specs: KernelspecsResponse | null, mode: string): KernelSpec | null {
  if (!specs) return null;
  for (const spec of Object.values(specs.kernelspecs)) {
    if (spec.codemirror_mode === mode) return spec;
  }
  return null;
}
