import { useCallback, useEffect, useState } from "react";
import type { Density } from "@/lib/design/visual-system";

const KEY = "abcl-secviz:density";

function read(): Density {
  if (typeof localStorage === "undefined") return "comfortable";
  const raw = localStorage.getItem(KEY);
  return raw === "compact" ? "compact" : "comfortable";
}

/**
 * Density mode (Linear-style toggle).
 *
 * Writes a `data-density` attribute on `<body>` and a localStorage entry.
 * All token-driven components react via CSS variables defined in index.css.
 */
export function useDensity() {
  const [density, setDensityState] = useState<Density>(() => read());

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.density = density;
    try {
      localStorage.setItem(KEY, density);
    } catch {
      // ignore quota
    }
  }, [density]);

  const setDensity = useCallback((d: Density) => setDensityState(d), []);
  const toggle = useCallback(
    () => setDensityState((d) => (d === "comfortable" ? "compact" : "comfortable")),
    [],
  );

  return { density, setDensity, toggle };
}
