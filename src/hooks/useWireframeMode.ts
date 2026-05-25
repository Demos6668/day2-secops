import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "abcl-secviz:wireframe";
const CLASS_NAME = "wireframe-mode";

function read(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function useWireframeMode() {
  const [enabled, setEnabled] = useState(() => read());

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle(CLASS_NAME, enabled);
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      // ignore quota
    }
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);
  return { enabled, setEnabled, toggle };
}
