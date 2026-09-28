"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyTotal } from "@/db/queries/reports";
import { adToBs, bsMonthName } from "@/lib/bs-date";
import { toNepaliDigits } from "@/lib/format";

type Props = {
  data: DailyTotal[];
  locale: string;
  yLabel: string;
  tooltipLabel: string;
};

/** Short BS label — day number only on mobile, "DD Mon" on wider screens */
function bsDayLabel(adYmd: string, locale: string, short: boolean): string {
  const bs = adToBs(adYmd);
  if (short) return toNepaliDigits(String(bs.date), locale);
  return toNepaliDigits(
    `${bs.date} ${bsMonthName(bs.year, bs.month, locale).slice(0, 3)}`,
    locale,
  );
}

function formatK(value: number): string {
  if (value >= 1_00_00_000) return `${(value / 1_00_00_000).toFixed(1)}Cr`;
  if (value >= 1_00_000) return `${(value / 1_00_000).toFixed(1)}L`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return String(value);
}

export function DonationBarChart({
  data,
  locale,
  yLabel,
  tooltipLabel,
}: Props) {
  // Detect narrow screens client-side so we can shorten labels
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 480px)");
    setNarrow(mq.matches);
    const handler = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const chartData = data.map((d) => ({
    day: bsDayLabel(d.date, locale, narrow),
    amount: Math.round(Number(d.total)),
    count: d.count,
    // Full label always available for tooltip
    fullDay: bsDayLabel(d.date, locale, false),
  }));

  return (
    // Taller on mobile so bars aren't squashed
    <div className="h-[280px] sm:h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 4, left: 0, bottom: narrow ? 0 : 4 }}
          role="img"
          aria-label={yLabel}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e7e5e4"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            tick={{ fontSize: narrow ? 10 : 11, fill: "#78716c" }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tickFormatter={formatK}
            tick={{ fontSize: narrow ? 10 : 11, fill: "#78716c" }}
            axisLine={false}
            tickLine={false}
            width={narrow ? 36 : 44}
          />
          <Tooltip
            formatter={(value: number) => [
              `Rs. ${value.toLocaleString("en-IN")}`,
              tooltipLabel,
            ]}
            // Show full date in tooltip regardless of screen width
            labelFormatter={(_, payload) =>
              payload?.[0]?.payload?.fullDay ?? ""
            }
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e7e5e4",
              fontSize: "12px",
            }}
            cursor={{ fill: "#fef3c7" }}
          />
          <Bar
            dataKey="amount"
            fill="#b45309"
            radius={[4, 4, 0, 0]}
            maxBarSize={narrow ? 24 : 40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
