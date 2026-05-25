import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/lib/workspace";
import { seedToolFromProfile } from "@/lib/feeder/seed";
import { buildTool } from "@/lib/visibility/score";
import { MockSource } from "@/lib/feeder/MockSource";
import { ServerSource } from "@/lib/feeder/ServerSource";
import type { VisibilitySource } from "@/lib/feeder/VisibilitySource";
import { buildEventKey, decideToast, type NotificationEvent } from "@/lib/notifications/budget";
import { isInboxOpen, pushNotification } from "@/components/NotificationCenter";
import { CAUSES } from "@/lib/visibility/causes";
import type { RagStatus, Tool, Tower } from "@/types/tool";

interface FeederContextValue {
  tools: Tool[];
  towerAlerts: Record<Tower, number>;
  lastTick: number | null;
  running: boolean;
  setRunning: (v: boolean) => void;
  /** User opt-in: pop toasts on Critical-on-Critical RED. */
  popToasts: boolean;
  setPopToasts: (v: boolean) => void;
  /** Switch between local MockSource (default) and the server WS source. */
  liveMode: boolean;
  setLiveMode: (v: boolean) => void;
}

const FeederContext = createContext<FeederContextValue | null>(null);

interface FeederProviderProps {
  children: ReactNode;
  sources?: VisibilitySource[];
  tickMinMs?: number;
  tickMaxMs?: number;
  autoStart?: boolean;
}

const EMPTY_TOWER_ALERTS: Record<Tower, number> = {
  "Endpoint Security": 0,
  "Application Security": 0,
  "Network Security": 0,
  "Data Security": 0,
  "Identity Security": 0,
};

const POP_TOASTS_KEY = "abcl-secviz:pop-toasts";
const LIVE_MODE_KEY = "abcl-secviz:live-mode";
const RECENT_WINDOW_MS = 6 * 60_000;

function readLiveModePreference(): boolean {
  if (typeof window === "undefined") return false;
  const url = new URLSearchParams(window.location.search);
  if (url.get("live") === "1") return true;
  if (url.get("live") === "0") return false;
  try {
    return localStorage.getItem(LIVE_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

// Per-session "first flip only" — once a tool has been toasted for a given
// status transition, we don't re-toast until it has moved off that status.
const sessionToastFiredFor = new Set<string>();

/** Trim text to a safe length so a poisoned upstream note can't blow up the UI. */
function sanitizeNote(s: unknown): string | undefined {
  if (typeof s !== "string") return undefined;
  const trimmed = s.trim();
  if (!trimmed) return undefined;
  // Strip control characters; cap length.
  // eslint-disable-next-line no-control-regex
  return trimmed.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 240);
}

export function FeederProvider({
  children,
  sources,
  // Tuned post-feedback: 8-15 s ticks (was 3-7 s).
  tickMinMs = 8_000,
  tickMaxMs = 15_000,
  autoStart = true,
}: FeederProviderProps) {
  const { toolSeeds } = useWorkspace();
  const [liveMode, setLiveModeState] = useState<boolean>(() => readLiveModePreference());
  const setLiveMode = useCallback((v: boolean) => {
    setLiveModeState(v);
    try {
      localStorage.setItem(LIVE_MODE_KEY, v ? "1" : "0");
    } catch {
      // ignore quota
    }
  }, []);
  const sourcesRef = useRef<VisibilitySource[]>(sources ?? [new MockSource()]);

  // Hot-swap source when liveMode flips (skipped when caller injected sources).
  useEffect(() => {
    if (sources) return;
    for (const s of sourcesRef.current) {
      if (s instanceof ServerSource) s.dispose();
    }
    sourcesRef.current = liveMode ? [new ServerSource()] : [new MockSource()];
  }, [liveMode, sources]);

  const mountedAtRef = useRef<number>(Date.now());

  const [tools, setTools] = useState<Tool[]>(() => toolSeeds.map((s) => seedToolFromProfile(s)));
  const [towerAlerts, setTowerAlerts] = useState<Record<Tower, number>>(EMPTY_TOWER_ALERTS);
  const [lastTick, setLastTick] = useState<number | null>(null);
  const [running, setRunning] = useState(autoStart);
  const [popToasts, setPopToastsState] = useState<boolean>(() => {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(POP_TOASTS_KEY) === "1";
  });
  const setPopToasts = useCallback((v: boolean) => {
    setPopToastsState(v);
    try {
      localStorage.setItem(POP_TOASTS_KEY, v ? "1" : "0");
    } catch {
      // ignore quota
    }
  }, []);

  // Reseed when the tool list changes (eg. AddTool wizard pushed an overlay).
  const seedIdsKey = useMemo(() => toolSeeds.map((s) => s.id).join("|"), [toolSeeds]);
  useEffect(() => {
    setTools(toolSeeds.map((s) => seedToolFromProfile(s)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedIdsKey]);

  const toolsRef = useRef(tools);
  useEffect(() => {
    toolsRef.current = tools;
  }, [tools]);

  const recentRef = useRef<
    { at: number; severity: NotificationEvent["severity"]; key: string; toastFired: boolean }[]
  >([]);

  const raise = useCallback(
    (
      event: Omit<NotificationEvent, "id" | "at" | "read" | "toastFired"> & {
        forceToast?: boolean;
      },
    ) => {
      const now = Date.now();
      recentRef.current = recentRef.current.filter((r) => r.at >= now - RECENT_WINDOW_MS);
      const key = event.key;

      // Per-session first-flip-only: if we already toasted this exact key, skip.
      const sessionGate = sessionToastFiredFor.has(key);

      const decision = decideToast({
        severity: event.severity,
        forceToast: event.forceToast && !sessionGate,
        recent: recentRef.current,
        key,
        now,
        popToasts,
        inboxOpen: isInboxOpen(),
        documentHidden:
          typeof document !== "undefined" ? document.visibilityState === "hidden" : false,
        msSinceMount: now - mountedAtRef.current,
      });

      const stored: NotificationEvent = {
        id: `n_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        at: now,
        read: false,
        toastFired: decision.toast,
        ...event,
      };

      recentRef.current.push({
        at: now,
        severity: event.severity,
        key,
        toastFired: decision.toast,
      });

      pushNotification(stored);

      if (decision.toast) {
        sessionToastFiredFor.add(key);
        toast(event.title, {
          description: event.description,
          duration: event.severity === "Critical" ? 6000 : 3500,
        });
      }

      // Clear the session gate when status moves AWAY from the locked status.
      // We approximate that here by clearing any toast-locked keys for the same
      // toolId whose toStatus differs.
      if (event.toolId && event.toStatus) {
        for (const k of Array.from(sessionToastFiredFor)) {
          if (k.startsWith(`${event.toolId}|`) && !k.endsWith(`|${event.toStatus}`)) {
            sessionToastFiredFor.delete(k);
          }
        }
      }
    },
    [popToasts],
  );

  const tick = useCallback(async () => {
    const stateMap = new Map(toolsRef.current.map((t) => [t.id, t]));
    for (const src of sourcesRef.current) {
      const owned = toolSeeds.filter((s) => src.owns(s));
      if (owned.length === 0) continue;
      let updates;
      try {
        updates = await src.fetch(owned, stateMap);
      } catch (e) {
        console.warn(`[feeder] source "${src.name}" threw`, e);
        continue;
      }
      if (updates.length === 0) continue;

      setTools((prev) => {
        const byId = new Map(prev.map((t) => [t.id, t]));
        const towerHits = new Set<Tower>();
        for (const u of updates) {
          const cur = byId.get(u.toolId);
          if (!cur) continue;
          const next = buildTool(cur, {
            observed: u.observed ?? cur.observed,
            lastSync: u.lastSync ?? cur.lastSync,
            causes: u.causes ?? cur.causes,
          });

          if (next.status !== cur.status) {
            const direction =
              ragOrder(next.status) > ragOrder(cur.status) ? "recovered" : "degraded";
            const kind: NotificationEvent["kind"] =
              direction === "recovered" ? "recovered" : "rag_flip";
            const isCritical = cur.severity === "Critical";
            // Only Critical-on-Critical RED is even a candidate for a toast.
            const forceToast = isCritical && next.status === "red";
            raise({
              key: buildEventKey({ toolId: cur.id, kind, toStatus: next.status }),
              title: `${cur.solution} ${direction === "recovered" ? "recovered" : "degraded"}`,
              description: `Status ${cur.status.toUpperCase()} → ${next.status.toUpperCase()}`,
              kind,
              severity: cur.severity,
              toolId: cur.id,
              fromStatus: cur.status,
              toStatus: next.status,
              forceToast,
            });
            towerHits.add(cur.tower);
          } else {
            // Cause set delta — no status flip. NEVER toasts (inbox only).
            const added = next.causes.filter((c) => !cur.causes.includes(c));
            const removed = cur.causes.filter((c) => !next.causes.includes(c));
            for (const c of added) {
              raise({
                key: buildEventKey({ toolId: cur.id, kind: "cause_added", toStatus: next.status }),
                title: `${cur.solution} — new cause`,
                description: `${CAUSES[c].label} (${CAUSES[c].weight})`,
                kind: "cause_added",
                severity: cur.severity,
                toolId: cur.id,
              });
              towerHits.add(cur.tower);
            }
            for (const c of removed) {
              raise({
                key: buildEventKey({
                  toolId: cur.id,
                  kind: "cause_cleared",
                  toStatus: next.status,
                }),
                title: `${cur.solution} — cleared`,
                description: `${CAUSES[c].label} resolved`,
                kind: "cause_cleared",
                severity: cur.severity,
                toolId: cur.id,
              });
            }
            const note = sanitizeNote(u.note);
            if (note && added.length === 0 && removed.length === 0) {
              raise({
                key: `${cur.id}|note|${note.slice(0, 24)}`,
                title: note,
                kind: "info",
                severity: "Low",
                toolId: cur.id,
              });
            }
          }

          byId.set(u.toolId, next);
        }
        if (towerHits.size > 0) {
          setTowerAlerts((prevAlerts) => {
            const out = { ...prevAlerts };
            for (const t of towerHits) out[t] = (out[t] ?? 0) + 1;
            return out;
          });
        }
        return Array.from(byId.values());
      });
    }
    setLastTick(Date.now());
  }, [toolSeeds, raise]);

  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (cancelled) return;
      const wait = tickMinMs + Math.random() * (tickMaxMs - tickMinMs);
      timer = setTimeout(async () => {
        if (cancelled) return;
        await tick();
        schedule();
      }, wait);
    };
    schedule();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [running, tick, tickMinMs, tickMaxMs]);

  const value = useMemo<FeederContextValue>(
    () => ({
      tools,
      towerAlerts,
      lastTick,
      running,
      setRunning,
      popToasts,
      setPopToasts,
      liveMode,
      setLiveMode,
    }),
    [tools, towerAlerts, lastTick, running, popToasts, setPopToasts, liveMode, setLiveMode],
  );

  return <FeederContext.Provider value={value}>{children}</FeederContext.Provider>;
}

export function useFeeder(): FeederContextValue {
  const ctx = useContext(FeederContext);
  if (!ctx) {
    throw new Error("useFeeder must be used inside <FeederProvider>");
  }
  return ctx;
}

function ragOrder(s: RagStatus): number {
  return s === "green" ? 2 : s === "amber" ? 1 : 0;
}
