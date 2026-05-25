import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { getRagToken } from "@/lib/rag-tokens";
import { buildEdges, type CategoryRelation } from "@/lib/feasibility/relations";
import type { Tool } from "@/types/tool";

interface RelationshipGraphProps {
  tools: Tool[];
  relations: CategoryRelation[];
  focusedId?: string;
}

type ToolNodeData = {
  tool: Tool;
  focused: boolean;
};

function layoutForTowerSeverity(tools: Tool[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const towers = [
    "Endpoint Security",
    "Application Security",
    "Network Security",
    "Data Security",
    "Identity Security",
  ] as const;
  const colWidth = 220;
  const rowHeight = 110;
  for (const [colIdx, tower] of towers.entries()) {
    const inTower = tools.filter((t) => t.tower === tower);
    inTower.forEach((t, rowIdx) => {
      positions.set(t.id, {
        x: colIdx * colWidth + 40,
        y: rowIdx * rowHeight + 40,
      });
    });
  }
  return positions;
}

function ToolNode({ data }: NodeProps<Node<ToolNodeData>>) {
  const { tool, focused } = data;
  const color = getRagToken(tool.status).hex;
  return (
    <div
      className="rounded-md border bg-card px-3 py-2 shadow-sm min-w-[200px] max-w-[230px]"
      style={{ borderColor: color, boxShadow: focused ? `0 0 0 2px ${color}` : undefined }}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block w-2 h-2 rounded-full"
          style={{ background: color }}
        />
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          {tool.tower}
        </div>
      </div>
      <div className="text-xs font-semibold truncate mt-0.5" title={tool.solution}>
        {tool.solution}
      </div>
      <div className="text-[10px] font-mono text-muted-foreground truncate" title={tool.oem}>
        {tool.oem}
      </div>
      <div className="text-[10px] mt-1" style={{ color }}>
        {((tool.observed / Math.max(1, tool.denominator)) * 100).toFixed(1)}% visible
      </div>
    </div>
  );
}

const nodeTypes = { tool: ToolNode };

export function RelationshipGraph({ tools, relations, focusedId }: RelationshipGraphProps) {
  const positions = useMemo(() => layoutForTowerSeverity(tools), [tools]);

  const nodes = useMemo<Node<ToolNodeData>[]>(
    () =>
      tools.map((t) => ({
        id: t.id,
        type: "tool",
        position: positions.get(t.id) ?? { x: 0, y: 0 },
        data: { tool: t, focused: t.id === focusedId },
      })),
    [tools, positions, focusedId],
  );

  const edges = useMemo<Edge[]>(() => {
    const raw = buildEdges(tools, relations);
    return raw.map((e, i) => ({
      id: `e-${i}-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      animated: e.kind === "same-category",
      style: {
        stroke: e.kind === "same-category" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
        strokeDasharray: e.kind === "adjacent" ? "4 3" : undefined,
        strokeWidth: 1.4,
      },
      label: e.label,
      labelStyle: { fontSize: 9, fontFamily: "var(--font-mono)" },
      labelBgStyle: { fill: "hsl(var(--card))", fillOpacity: 0.8 },
    }));
  }, [tools, relations]);

  return (
    <div className="h-[560px] rounded-md border border-white/5 bg-background/40 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        edgesFocusable={false}
        minZoom={0.4}
        maxZoom={1.8}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1}
          color="rgba(255,255,255,0.06)"
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
