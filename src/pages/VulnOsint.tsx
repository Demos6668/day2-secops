import { useCallback, useEffect, useRef, useState } from "react";
import {
  Globe2,
  ArrowUpRight,
  RefreshCw,
  Maximize2,
  Minimize2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { Card, CardContent } from "@/components/ui/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DEFAULT_OSINT_PORT = 5173;
// Probe is one of two signals — the iframe's onLoad is the authoritative one.
// We give the probe plenty of room (10s) so a slow dev VM doesn't false-fail.
const PROBE_TIMEOUT_MS = 10_000;
// Hard "give up" window. If neither the iframe nor the probe has reported
// success within this many ms, surface the unreachable panel.
const UNREACHABLE_AFTER_MS = 12_000;

function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Resolve the OSINT origin.
 *
 * If `VITE_DAY2_OSINT_URL` is set (and safe http/https), use it verbatim.
 * Otherwise derive the origin from `window.location` so a SecOps user
 * reaching us via `http://192.168.x.y:5174/` doesn't get an iframe pointed
 * at `localhost:5173` — which would refer to *their own* machine and fail
 * with ERR_CONNECTION_REFUSED whenever they're not on the same host as
 * the dev servers.
 */
function resolveOsintUrl(): string {
  const fromEnv = import.meta.env.VITE_DAY2_OSINT_URL as string | undefined;
  if (fromEnv && isSafeHttpUrl(fromEnv)) return fromEnv;
  if (typeof window !== "undefined" && window.location?.protocol && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:${DEFAULT_OSINT_PORT}`;
  }
  return `http://localhost:${DEFAULT_OSINT_PORT}`;
}

const DAY2_OSINT_URL = resolveOsintUrl();
const OSINT_CONFIGURED = !!(import.meta.env.VITE_DAY2_OSINT_URL as string | undefined);

type Reachability = "probing" | "ready" | "unreachable";

export default function VulnOsint() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // Two independent signals — either succeeding flips us to "ready".
  // The iframe's onLoad is the authoritative one (the embed actually painted);
  // the fetch probe is a parallel hint that fails fast when the origin is
  // truly refusing connections. We only declare "unreachable" after both
  // have failed AND the hard-give-up window elapses, so a flaky no-cors
  // fetch quirk in one browser can't blank the whole page on its own.
  const [probeOk, setProbeOk] = useState<boolean | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [giveUp, setGiveUp] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const reachability: Reachability =
    iframeLoaded || probeOk === true
      ? "ready"
      : probeOk === false && giveUp
        ? "unreachable"
        : "probing";

  useEffect(() => {
    setProbeOk(null);
    setIframeLoaded(false);
    setGiveUp(false);

    const ctl = new AbortController();
    const probeTimer = window.setTimeout(() => ctl.abort(), PROBE_TIMEOUT_MS);
    const giveUpTimer = window.setTimeout(() => setGiveUp(true), UNREACHABLE_AFTER_MS);

    fetch(DAY2_OSINT_URL, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: ctl.signal,
      credentials: "omit",
    })
      .then(() => setProbeOk(true))
      .catch(() => setProbeOk(false))
      .finally(() => window.clearTimeout(probeTimer));

    return () => {
      window.clearTimeout(probeTimer);
      window.clearTimeout(giveUpTimer);
      ctl.abort();
    };
  }, [reloadKey]);

  useEffect(() => {
    function onFsChange() {
      setFullscreen(document.fullscreenElement === wrapRef.current);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const toggleFullscreen = async () => {
    if (!wrapRef.current) return;
    if (document.fullscreenElement === wrapRef.current) {
      await document.exitFullscreen().catch(() => undefined);
    } else {
      await wrapRef.current.requestFullscreen().catch(() => undefined);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Vuln Mgmt — OSINT"
        icon={Globe2}
        description="Day2 OSINT — embedded. External threat-intel aggregator (CERT-In, CVE / KEV, MITRE ATT&CK, IOC lake) runs inline below."
        breadcrumb={[{ label: "Vuln Mgmt" }, { label: "OSINT" }]}
      />

      <Card className="glass-panel">
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-8 h-8 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <Globe2 className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold">Day2 OSINT</h2>
                <StatusPill state={reachability} />
                {!OSINT_CONFIGURED && (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-[#B45309]/40 text-[#F59E0B]"
                  >
                    localhost
                  </Badge>
                )}
                <span className="text-[10px] font-mono text-muted-foreground truncate">
                  {DAY2_OSINT_URL}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={reload}
                className="h-7 text-[11px]"
                aria-label="Reload OSINT"
              >
                <RefreshCw className="h-3 w-3 mr-1.5" aria-hidden="true" />
                Reload
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={toggleFullscreen}
                className="h-7 text-[11px]"
                aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                disabled={reachability !== "ready"}
              >
                {fullscreen ? (
                  <Minimize2 className="h-3 w-3 mr-1.5" aria-hidden="true" />
                ) : (
                  <Maximize2 className="h-3 w-3 mr-1.5" aria-hidden="true" />
                )}
                {fullscreen ? "Exit" : "Fullscreen"}
              </Button>
              <Button asChild size="sm" className="h-7 text-[11px]">
                <a
                  href={DAY2_OSINT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open Day2 OSINT in a new tab"
                >
                  New tab
                  <span className="sr-only"> (opens in new tab)</span>
                  <ArrowUpRight className="h-3 w-3 ml-1.5" aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>

          <div
            ref={wrapRef}
            className={cn(
              "relative rounded-md border hairline overflow-hidden bg-card",
              fullscreen ? "h-screen" : "h-[78vh] min-h-[560px]",
            )}
            data-osint-state={reachability}
          >
            {reachability === "probing" && (
              <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Checking Day2 OSINT…
                </div>
              </div>
            )}

            {reachability === "unreachable" && (
              <div className="absolute inset-0 flex items-center justify-center bg-card z-10 px-6">
                <div className="max-w-md text-center space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-full bg-[#B45309]/15 border border-[#B45309]/40 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-[#F59E0B]" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Day2 OSINT is not reachable</h3>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Nothing answered at <code>{DAY2_OSINT_URL}</code> within{" "}
                      {UNREACHABLE_AFTER_MS / 1000}s. The service may not be running, or this host
                      cannot reach that origin.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={reload}
                      className="h-7 text-[11px]"
                    >
                      <RefreshCw className="h-3 w-3 mr-1.5" aria-hidden="true" />
                      Retry
                    </Button>
                    <Button asChild size="sm" className="h-7 text-[11px]">
                      <a
                        href={DAY2_OSINT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open Day2 OSINT in a new tab"
                      >
                        Open in new tab
                        <ArrowUpRight className="h-3 w-3 ml-1.5" aria-hidden="true" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {!iframeLoaded && reachability !== "unreachable" && (
              <div className="absolute inset-0 flex items-center justify-center bg-card/70 backdrop-blur-sm z-10 pointer-events-none">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Loading Day2 OSINT…
                </div>
              </div>
            )}

            {reachability !== "unreachable" && (
              <iframe
                key={reloadKey}
                ref={iframeRef}
                src={DAY2_OSINT_URL}
                title="Day2 OSINT"
                className="w-full h-full border-0 bg-background"
                // Sandbox: allow scripts + same-origin so a real SPA loads, plus
                // forms / popups for sign-in flows. Top-navigation is denied so
                // the child can't redirect the parent window.
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                referrerPolicy="no-referrer"
                allow="clipboard-read; clipboard-write"
                onLoad={() => setIframeLoaded(true)}
              />
            )}
          </div>

          <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-2 flex-wrap">
            <span>
              Endpoint <code>{DAY2_OSINT_URL}</code> · status{" "}
              <span
                className={cn(
                  reachability === "ready" && "text-[#4ADE80]",
                  reachability === "unreachable" && "text-[#F59E0B]",
                )}
              >
                {reachability}
              </span>
            </span>
            <span>
              (override with <code>VITE_DAY2_OSINT_URL</code>)
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardContent className="p-3 text-[11px] text-muted-foreground space-y-1">
          <p>
            <strong>Integration model</strong>: Day2 OSINT runs as a sister service and is embedded
            here via iframe. Cross-origin SSO bridge is planned for Phase-real — today, signing into
            OSINT once carries the session through.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusPill({ state }: { state: Reachability }) {
  if (state === "ready") {
    return (
      <Badge variant="outline" className="text-[10px] border-[#22C55E]/40 text-[#4ADE80] gap-1">
        <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
        connected
      </Badge>
    );
  }
  if (state === "unreachable") {
    return (
      <Badge variant="outline" className="text-[10px] border-[#B45309]/40 text-[#F59E0B] gap-1">
        <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
        unreachable
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] gap-1">
      <RefreshCw className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
      probing
    </Badge>
  );
}
