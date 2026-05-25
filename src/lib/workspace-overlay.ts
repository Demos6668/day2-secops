/**
 * Workspace overlay — adds tool seeds at runtime without writing to disk.
 *
 * Phase 4 plug-and-play wizard pushes new seeds here; FeederProvider reads
 * from `useWorkspaceSeeds()` (which merges the JSON seeds + this overlay)
 * so the dashboard surfaces the new tile immediately.
 *
 * Phase-real: when a real backend lands, replace localStorage with a POST
 * to a workspace-config endpoint.
 */

import { useEffect, useState } from "react";
import type { ToolSeed } from "@/types/tool";

const KEY = "abcl-secviz:tool-overlay";
const EVT = "abcl-secviz:overlay-changed";

interface OverlayShape {
  seeds: ToolSeed[];
}

function read(): OverlayShape {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { seeds: [] };
    const parsed = JSON.parse(raw) as OverlayShape;
    if (!Array.isArray(parsed.seeds)) return { seeds: [] };
    return parsed;
  } catch {
    return { seeds: [] };
  }
}

function write(overlay: OverlayShape) {
  localStorage.setItem(KEY, JSON.stringify(overlay));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function listOverlaySeeds(): ToolSeed[] {
  return read().seeds;
}

export function addOverlaySeed(seed: ToolSeed): void {
  const overlay = read();
  if (overlay.seeds.some((s) => s.id === seed.id)) {
    throw new Error(`Tool with id "${seed.id}" already exists in overlay.`);
  }
  overlay.seeds.push(seed);
  write(overlay);
}

export function removeOverlaySeed(id: string): void {
  const overlay = read();
  write({ seeds: overlay.seeds.filter((s) => s.id !== id) });
}

export function clearOverlay(): void {
  write({ seeds: [] });
}

export function useOverlaySeeds(): ToolSeed[] {
  const [seeds, setSeeds] = useState<ToolSeed[]>(() => read().seeds);
  useEffect(() => {
    const handler = () => setSeeds(read().seeds);
    window.addEventListener(EVT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return seeds;
}
