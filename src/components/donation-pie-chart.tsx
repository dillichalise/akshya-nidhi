"use client";

import { useSyncExternalStore } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { AmountBracket } from "@/db/queries/reports";

// Amber/earth tones consistent with the app palette
const COLORS = [
  "#fbbf24", // amber-400
  "#f59e0b", // amber-500
  "#d97706", // amber-600
  "#b45309", // amber-700
  "#92400e", // amber-800
  "#78350f", // amber-900
];

const WIDE_QUERY = "(min-width: 480px)";

function subscribeWide(callback: () => void) {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getWideSnapshot() {
  return window.matchMedia(WIDE_QUERY).matches;
}

function getWideServerSnapshot() {
  return true;
}

type Props = {
  data: AmountBracket[];
  ariaLabel: string;
};

export function DonationPieChart({ data, ariaLabel }: Props) {
  const total = data.reduce((s, d) => s + d.count, 0);

  // Show inline labels only on wider screens where they won't overlap
  const wide = useSyncExternalStore(
    subscribeWide,
    getWideSnapshot,
    getWideServerSnapshot,
  );

  if (total === 0) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-stone-400">
        —
      </div>
    );
  }

  return (
    // Taller on mobile to give the bottom legend enough room
    <div className="h-[300px] sm:h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart role="img" aria-label={ariaLabel}>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            cx="50%"
            cy="45%"
            outerRadius={wide ? 85 : 70}
            innerRadius={wide ? 42 : 34}
            paddingAngle={2}
            // Inline labels only on wider screens
            label={
              wide
                ? ({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                : false
            }
            labelLine={wide}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value} donations`,
              name,
            ]}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e7e5e4",
              fontSize: "12px",
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            // On mobile, wrap legend items compactly
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ paddingTop: "8px", fontSize: "11px" }}
            formatter={(value) => (
              <span style={{ fontSize: 11, color: "#78716c" }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
