/**
 * Tiny admin API client. All endpoints are same-origin (/api), credentials
 * always included so the session cookie flows.
 */

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!r.ok) {
    let body: unknown = null;
    try {
      body = await r.json();
    } catch {
      // ignore body parse failure
    }
    const err = new Error(`HTTP ${r.status}`) as Error & { status: number; body: unknown };
    err.status = r.status;
    err.body = body;
    throw err;
  }
  if (r.status === 204) return undefined as T;
  return (await r.json()) as T;
}

export interface AdminUser {
  id: string;
  username: string;
  role: string;
}

export const adminApi = {
  me: () => request<{ user: AdminUser }>("/admin/me"),
  login: (username: string, password: string) =>
    request<{ ok: true; user: AdminUser }>("/admin/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request<{ ok: true }>("/admin/logout", { method: "POST" }),

  tools: () =>
    request<{
      tools: Array<{
        id: string;
        workspaceId: string;
        seed: {
          solution: string;
          oem: string;
          severity: string;
          tower: string;
          denominator: number;
        };
        webhookEnabled: boolean;
        hasSecret: boolean;
      }>;
      circuits: Record<
        string,
        {
          state: "closed" | "open" | "half-open";
          failures: number;
          openedAt: number | null;
          lastSuccessAt: number | null;
          lastFailureAt: number | null;
        }
      >;
    }>("/admin/tools"),

  patchTool: (toolId: string, body: Record<string, unknown>) =>
    request<{ ok: true }>(`/admin/tools/${encodeURIComponent(toolId)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  rotateSecret: (toolId: string) =>
    request<{ ok: true; secret: string }>(
      `/admin/tools/${encodeURIComponent(toolId)}/rotate-secret`,
      { method: "POST" },
    ),

  testFire: (toolId: string) =>
    request<{ ok: true; message: string }>(`/admin/tools/${encodeURIComponent(toolId)}/test-fire`, {
      method: "POST",
    }),

  integrations: () =>
    request<{
      recipes: Array<{
        oem: string;
        toolId: string;
        vendorPath: string;
        requiredHeaders: { name: string; value: string }[];
        curl: string;
        notes: string[];
      }>;
    }>("/admin/integrations"),
};

export function isUnauthorized(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    (err as { status: number }).status === 401
  );
}
