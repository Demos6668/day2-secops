import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { getRagToken } from "@/lib/rag-tokens";
import { seedVisibilityHistory } from "@/lib/feeder/seed";
import type { Tool } from "@/types/tool";

interface VisibilitySparklineProps {
  tool: Tool;
  height?: number;
}

export function VisibilitySparkline({ tool, height = 80 }: VisibilitySparklineProps) {
  const data = useMemo(() => seedVisibilityHistory(tool), [tool]);
  const color = getRagToken(tool.status).hex;
  const gradientId = `spark-${tool.id}`;
  const min = Math.min(...data.map((d) => d.pct));
  const max = Math.max(...data.map((d) => d.pct));
  const pad = Math.max(0.005, (max - min) * 0.4);

  return (
    <div style={{ height }} aria-label={`Visibility history for ${tool.solution}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={[Math.max(0, min - pad), Math.min(1, max + pad)]} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 11,
              padding: "4px 8px",
            }}
            labelFormatter={() => ""}
            formatter={(v: number) => [`${(v * 100).toFixed(2)}%`, "visible"]}
          />
          <Area
            type="monotone"
            dataKey="pct"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
