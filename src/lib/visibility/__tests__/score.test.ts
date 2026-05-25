import { describe, expect, it } from "vitest";
import { scoreVisibility, scoreToStatus } from "@/lib/visibility/score";

describe("scoreVisibility", () => {
  it("returns green for full coverage with no causes", () => {
    const r = scoreVisibility({
      severity: "Moderate",
      observed: 1000,
      denominator: 1000,
      causes: [],
    });
    expect(r.score).toBe(100);
    expect(r.status).toBe("green");
  });

  it("applies severity weight to gap penalty", () => {
    // 95% coverage, no causes
    const crit = scoreVisibility({
      severity: "Critical",
      observed: 95,
      denominator: 100,
      causes: [],
    });
    const mod = scoreVisibility({
      severity: "Moderate",
      observed: 95,
      denominator: 100,
      causes: [],
    });
    expect(crit.gapPenalty).toBeCloseTo(7.5); // 5% * 1.5
    expect(mod.gapPenalty).toBeCloseTo(5.0); // 5% * 1.0
  });

  it("forces red on Critical with any High-weight cause", () => {
    const r = scoreVisibility({
      severity: "Critical",
      observed: 1000,
      denominator: 1000,
      causes: ["telemetry_blocked"],
    });
    expect(r.status).toBe("red");
    expect(r.override).toBe("critical_high_cause");
  });

  it("forces red on Critical when visibility < 85%", () => {
    const r = scoreVisibility({
      severity: "Critical",
      observed: 80,
      denominator: 100,
      causes: [],
    });
    expect(r.status).toBe("red");
    expect(r.override).toBe("critical_low_visibility");
  });

  it("does NOT force red on Moderate at 80% coverage", () => {
    const r = scoreVisibility({
      severity: "Moderate",
      observed: 80,
      denominator: 100,
      causes: [],
    });
    // gap_penalty = 20 * 1.0 = 20, score = 80 → amber
    expect(r.status).toBe("amber");
    expect(r.override).toBeUndefined();
  });

  it("counts decommission_ghost (Low weight = 2)", () => {
    const r = scoreVisibility({
      severity: "Moderate",
      observed: 100,
      denominator: 100,
      causes: ["decommission_ghost"],
    });
    expect(r.causePenalty).toBe(2);
    expect(r.score).toBe(98);
    expect(r.status).toBe("green");
  });

  it("clamps score to [0, 100]", () => {
    const r = scoreVisibility({
      severity: "Critical",
      observed: 0,
      denominator: 100,
      causes: ["agent_absent", "agent_silent", "telemetry_blocked", "coverage_gap"],
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("handles zero denominator without dividing by zero", () => {
    const r = scoreVisibility({
      severity: "Low",
      observed: 0,
      denominator: 0,
      causes: [],
    });
    expect(r.visibilityPct).toBe(0);
    expect(Number.isFinite(r.score)).toBe(true);
  });
});

describe("scoreToStatus", () => {
  it("uses brief thresholds", () => {
    expect(scoreToStatus(95)).toBe("green");
    expect(scoreToStatus(90)).toBe("green");
    expect(scoreToStatus(89)).toBe("amber");
    expect(scoreToStatus(70)).toBe("amber");
    expect(scoreToStatus(69)).toBe("red");
  });
});
