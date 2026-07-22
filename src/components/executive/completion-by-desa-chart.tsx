"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DesaCompletionRow } from "@/lib/executive";

export function CompletionByDesaChart({ data }: { data: DesaCompletionRow[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Belum ada tugas per desa.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.desaName.length > 14 ? `${d.desaName.slice(0, 12)}…` : d.desaName,
    fullName: d.desaName,
    pct: d.pct,
    selesai: d.selesai,
    total: d.total,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--muted)"
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={chartData.length > 6 ? -25 : 0}
            textAnchor={chartData.length > 6 ? "end" : "middle"}
            height={chartData.length > 6 ? 60 : 30}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            unit="%"
            width={40}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            contentStyle={{
              borderRadius: 12,
              border: "none",
              boxShadow: "var(--shadow-card)",
              background: "var(--card)",
              color: "var(--card-foreground)",
              fontSize: 12,
            }}
            formatter={(value, _name, item) => {
              const payload = item?.payload as
                | { selesai?: number; total?: number; fullName?: string }
                | undefined;
              return [
                `${value as number}% (${payload?.selesai ?? 0}/${payload?.total ?? 0})`,
                "Selesai",
              ];
            }}
            labelFormatter={(_label, payload) => {
              const p = payload?.[0]?.payload as { fullName?: string } | undefined;
              return p?.fullName ?? _label;
            }}
          />
          <Bar
            dataKey="pct"
            name="Selesai"
            fill="var(--primary)"
            radius={[8, 8, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
