import { describe, expect, it } from "vitest";
import { cellFor, rollupControl, rollupFramework } from "@/lib/audit/coverage";
import type { Framework, FrameworkControl, Tool } from "@/types/tool";

const baseTool = (overrides: Partial<Tool>): Tool => ({
  id: "x",
  severity: "Moderate",
  tower: "Endpoint Security",
  solution: "X",
  oem: "Acme",
  hosting: "SaaS",
  denominator: 100,
  mockProfile: "healthy",
  observed: 100,
  lastSync: new Date().toISOString(),
  causes: [],
  status: "green",
  score: 100,
  ...overrides,
});

const ctrl = (anchorTools: string[]): FrameworkControl => ({
  id: "C1",
  title: "Test control",
  anchorTools,
});

describe("cellFor", () => {
  it("returns NA when the tool is not anchored", () => {
    const result = cellFor(ctrl([]), baseTool({ id: "a" }));
    expect(result.status).toBe("na");
  });

  it("returns covered for anchored, green tool", () => {
    const result = cellFor(ctrl(["a"]), baseTool({ id: "a", status: "green" }));
    expect(result.status).toBe("covered");
  });

  it("downgrades to partial for anchored amber tool", () => {
    const result = cellFor(ctrl(["a"]), baseTool({ id: "a", status: "amber" }));
    expect(result.status).toBe("partial");
  });

  it("downgrades to partial for anchored red tool", () => {
    const result = cellFor(ctrl(["a"]), baseTool({ id: "a", status: "red" }));
    expect(result.status).toBe("partial");
  });
});

describe("rollupControl", () => {
  it("classifies a control with one healthy anchor as covered", () => {
    const tools = [baseTool({ id: "a", status: "green" })];
    const r = rollupControl(ctrl(["a"]), tools);
    expect(r.overall).toBe("covered");
  });

  it("classifies a control with no anchors as gap", () => {
    const tools = [baseTool({ id: "a", status: "green" })];
    const r = rollupControl(ctrl([]), tools);
    expect(r.overall).toBe("gap");
  });
});

describe("rollupFramework", () => {
  it("totals controls by status", () => {
    const tools = [baseTool({ id: "a", status: "green" }), baseTool({ id: "b", status: "red" })];
    const fw: Framework = {
      id: "fw",
      name: "Test",
      shortName: "T",
      controls: [ctrl(["a"]), ctrl(["b"]), ctrl([])],
    };
    const r = rollupFramework(fw, tools);
    expect(r.totals).toEqual({ covered: 1, partial: 1, gap: 1, total: 3 });
  });
});
