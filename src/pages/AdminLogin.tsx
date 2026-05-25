import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Brand";
import { DemoWatermark } from "@/components/Common/DemoWatermark";
import { adminApi, isUnauthorized } from "@/lib/admin-api";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("changeme");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, skip the form.
  useEffect(() => {
    let cancelled = false;
    adminApi.me().then(
      () => !cancelled && setLocation("/admin"),
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [setLocation]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminApi.login(username, password);
      setLocation("/admin");
    } catch (err) {
      setError(isUnauthorized(err) ? "Invalid credentials" : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="glass-panel w-full max-w-sm">
        <CardContent className="p-6 space-y-5">
          <div className="flex flex-col items-center gap-2">
            <Logo size={40} withWordmark={false} />
            <div className="text-center">
              <h1 className="text-base font-semibold">Day2 SecOps Admin</h1>
              <p className="text-[11px] text-muted-foreground">
                Sign in to manage tools, webhooks, and integrations.
              </p>
            </div>
            <DemoWatermark text="DEMO ADMIN — default admin/changeme" />
          </div>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="space-y-1">
              <Label htmlFor="username" className="text-[10px] uppercase tracking-widest font-mono">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password" className="text-[10px] uppercase tracking-widest font-mono">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-8"
              />
            </div>
            {error && (
              <div className="text-[11px] text-[#F87171] font-mono" role="alert">
                {error}
              </div>
            )}
            <Button type="submit" disabled={busy} className="w-full">
              <Lock className="h-3 w-3 mr-1.5" />
              {busy ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
