import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Vim-style "g <letter>" two-key shortcuts plus a few one-key ones.
 *
 *   g d   → /
 *   g i   → /tools
 *   g a   → /audit
 *   g c   → /change
 *   g f   → /feasibility
 *   g s   → /search
 *   g n   → /tools/new
 *   ?     → open command palette
 *   esc   → exits any modal owned by Radix (handled natively)
 */
export function useGlobalShortcuts() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    let leader: NodeJS.Timeout | null = null;
    let armed = false;

    const isEditable = (el: EventTarget | null) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return true;
      if (el.isContentEditable) return true;
      return false;
    };

    const go = (path: string) => {
      armed = false;
      if (leader) clearTimeout(leader);
      leader = null;
      setLocation(path);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditable(e.target)) return;

      if (e.key === "?" && !armed) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("abcl-secviz:open-command"));
        return;
      }

      if (!armed) {
        if (e.key === "g" || e.key === "G") {
          armed = true;
          if (leader) clearTimeout(leader);
          leader = setTimeout(() => {
            armed = false;
            leader = null;
          }, 900);
        }
        return;
      }

      // armed — second key of a g<letter> chord
      const code = e.key.toLowerCase();
      switch (code) {
        case "d":
          go("/");
          break;
        case "i":
          go("/tools");
          break;
        case "n":
          go("/tools/new");
          break;
        case "a":
          go("/audit");
          break;
        case "c":
          go("/change");
          break;
        case "f":
          go("/feasibility");
          break;
        case "s":
          go("/search");
          break;
        case "e":
          go("/settings");
          break;
        default:
          armed = false;
          if (leader) clearTimeout(leader);
          leader = null;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (leader) clearTimeout(leader);
    };
  }, [setLocation]);
}
