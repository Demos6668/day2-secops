import { useEffect, useState, type ReactNode } from "react";
import { Redirect } from "wouter";
import { Loader } from "@/components/Common/Loader";
import { adminApi, isUnauthorized, type AdminUser } from "@/lib/admin-api";

interface AdminGateProps {
  children: (user: AdminUser, logout: () => Promise<void>) => ReactNode;
}

/**
 * Calls /api/admin/me on mount; renders children with the user once authed,
 * or redirects to /admin/login when unauthenticated.
 */
export function AdminGate({ children }: AdminGateProps) {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ok"; user: AdminUser }
    | { kind: "anon" }
    | { kind: "err"; msg: string }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    adminApi
      .me()
      .then((r) => !cancelled && setState({ kind: "ok", user: r.user }))
      .catch((err) => {
        if (cancelled) return;
        if (isUnauthorized(err)) setState({ kind: "anon" });
        else setState({ kind: "err", msg: (err as Error).message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size="lg" />
      </div>
    );
  }

  if (state.kind === "anon") return <Redirect to="/admin/login" />;

  if (state.kind === "err") {
    return (
      <div className="p-6 text-sm text-[#F87171] font-mono">
        Admin API is unreachable — {state.msg}. Is the server running on :8082?
      </div>
    );
  }

  const logout = async () => {
    await adminApi.logout().catch(() => undefined);
    setState({ kind: "anon" });
  };

  return <>{children(state.user, logout)}</>;
}
