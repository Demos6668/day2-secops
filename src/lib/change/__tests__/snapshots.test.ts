import { describe, expect, it, beforeEach } from "vitest";
import { diffSnapshots, type Snapshot } from "@/lib/change/snapshots";
import type { Tool } from "@/types/tool";

const tool = (overrides: Partial<Tool> = {}): Tool => ({
  id: "x",
  severity: "Moderate",
  tower: "Endpoint Security",
  solution: "X",
  oem: "Acme",
  hosting: "SaaS",
  denominator: 100,
  mockProfile: "healthy",
  observed: 100,
  lastSync: "2026-01-01T00:00:00.000Z",
  causes: [],
  status: "green",
  score: 100,
  ...overrides,
});

const snap = (tools: Tool[]): Snapshot => ({
  id: "s",
  takenAt: new Date().toISOString(),
  trigger: "test",
  tools,
});

beforeEach(() => localStorage.clear());

describe("diffSnapshots", () => {
  it("flags added and removed tools", () => {
    const a = snap([tool({ id: "old" })]);
    const b = snap([tool({ id: "new" })]);
    const d = diffSnapshots(a, b);
    expect(d.find((x) => x.kind === "removed" && x.toolId === "old")).toBeTruthy();
    expect(d.find((x) => x.kind === "added" && x.toolId === "new")).toBeTruthy();
  });

  it("flags RAG status changes", () => {
    const a = snap([tool({ status: "green" })]);
    const b = snap([tool({ status: "red" })]);
    const d = diffSnapshots(a, b);
    expect(d.some((x) => x.kind === "status_changed")).toBe(true);
  });

  it("flags coverage shifts beyond 1%", () => {
    const a = snap([tool({ observed: 100, denominator: 100 })]);
    const b = snap([tool({ observed: 98, denominator: 100 })]);
    const d = diffSnapshots(a, b);
    expect(d.some((x) => x.kind === "coverage_shifted")).toBe(true);
  });

  it("does NOT flag sub-1% drifts", () => {
    const a = snap([tool({ observed: 100, denominator: 1000 })]);
    const b = snap([tool({ observed: 105, denominator: 1000 })]);
    const d = diffSnapshots(a, b);
    expect(d.some((x) => x.kind === "coverage_shifted")).toBe(false);
  });

  it("flags cause set changes", () => {
    const a = snap([tool({ causes: [] })]);
    const b = snap([tool({ causes: ["agent_silent"] })]);
    const d = diffSnapshots(a, b);
    expect(d.some((x) => x.kind === "causes_changed")).toBe(true);
  });
});
