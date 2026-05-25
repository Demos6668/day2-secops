import { describe, expect, it } from "vitest";
import { buildBucketKey, buildEventKey, decideToast } from "@/lib/notifications/budget";

const base = {
  recent: [] as {
    at: number;
    severity: "Critical" | "Moderate" | "Low";
    key: string;
    toastFired: boolean;
  }[],
  now: 1_000_000,
  popToasts: true,
  inboxOpen: false,
  documentHidden: false,
  msSinceMount: 60_000,
};

describe("decideToast", () => {
  it("returns toasts_off when popToasts=false", () => {
    const r = decideToast({ ...base, popToasts: false, severity: "Critical", key: "k" });
    expect(r.toast).toBe(false);
    expect(r.reason).toBe("toasts_off");
  });

  it("force toast on Critical RED still fires when popToasts=false (force bypass)", () => {
    const r = decideToast({
      ...base,
      popToasts: false,
      severity: "Critical",
      key: "k",
      forceToast: true,
    });
    expect(r.toast).toBe(true);
    expect(r.reason).toBe("force");
  });

  it("never toasts during the 5s warmup window", () => {
    const r = decideToast({ ...base, severity: "Critical", key: "k", msSinceMount: 2_000 });
    expect(r.toast).toBe(false);
    expect(r.reason).toBe("warmup");
  });

  it("never toasts when the inbox is open", () => {
    const r = decideToast({ ...base, severity: "Critical", key: "k", inboxOpen: true });
    expect(r.toast).toBe(false);
    expect(r.reason).toBe("inbox_open");
  });

  it("never toasts when the document is hidden", () => {
    const r = decideToast({ ...base, severity: "Critical", key: "k", documentHidden: true });
    expect(r.toast).toBe(false);
    expect(r.reason).toBe("document_hidden");
  });

  it("Moderate is tier-gated (zero budget) even with popToasts on", () => {
    const r = decideToast({ ...base, severity: "Moderate", key: "k" });
    expect(r.toast).toBe(false);
    expect(r.reason).toBe("tier_gated");
  });

  it("Critical respects the 2-per-60s budget", () => {
    const recent = [
      { at: 1_000_000 - 1000, severity: "Critical" as const, key: "a", toastFired: true },
      { at: 1_000_000 - 2000, severity: "Critical" as const, key: "b", toastFired: true },
    ];
    const r = decideToast({ ...base, severity: "Critical", key: "c", recent });
    expect(r.toast).toBe(false);
    expect(r.reason).toBe("budget_exhausted");
  });

  it("Critical dedups within the 5-minute window", () => {
    const recent = [
      {
        at: 1_000_000 - 4 * 60_000,
        severity: "Critical" as const,
        key: "dup",
        toastFired: true,
      },
    ];
    const r = decideToast({ ...base, severity: "Critical", key: "dup", recent });
    expect(r.toast).toBe(false);
    expect(r.reason).toBe("dedup");
  });
});

describe("key builders", () => {
  it("event keys vary by toStatus, bucket keys do not", () => {
    const a = buildEventKey({ toolId: "x", kind: "rag_flip", toStatus: "red" });
    const b = buildEventKey({ toolId: "x", kind: "rag_flip", toStatus: "amber" });
    expect(a).not.toBe(b);
    const ba = buildBucketKey({ toolId: "x", kind: "rag_flip" });
    const bb = buildBucketKey({ toolId: "x", kind: "rag_flip" });
    expect(ba).toBe(bb);
  });
});
