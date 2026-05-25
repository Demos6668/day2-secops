import { describe, expect, it } from "vitest";
import { buildEdges } from "@/lib/feasibility/relations";

describe("buildEdges", () => {
  it("links two tools in the same category", () => {
    const edges = buildEdges(
      [
        { id: "a", category: "waf" },
        { id: "b", category: "waf" },
      ],
      [],
    );
    expect(edges).toHaveLength(1);
    expect(edges[0].kind).toBe("same-category");
  });

  it("respects explicit adjacent rules", () => {
    const edges = buildEdges(
      [
        { id: "a", category: "edr-hips" },
        { id: "b", category: "host-protection" },
      ],
      [{ from: "edr-hips", to: "host-protection", kind: "adjacent", label: "Endpoint adjacency" }],
    );
    expect(edges).toHaveLength(1);
    expect(edges[0].kind).toBe("adjacent");
  });

  it("does not duplicate a same-category pair across symmetric self-rules", () => {
    const edges = buildEdges(
      [
        { id: "a", category: "waf" },
        { id: "b", category: "waf" },
      ],
      [{ from: "waf", to: "waf", kind: "same-category", label: "Both WAF" }],
    );
    expect(edges).toHaveLength(1);
  });

  it("ignores tools without a category", () => {
    const edges = buildEdges(
      [
        { id: "a", category: undefined },
        { id: "b", category: "waf" },
      ],
      [],
    );
    expect(edges).toHaveLength(0);
  });
});
