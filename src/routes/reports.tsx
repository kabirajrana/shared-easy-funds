import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGate } from "@/components/layout/AuthGate";
import { api } from "@/services/api";
import { formatNPR, useSession } from "@/lib/session";
import {
  Bar, BarChart, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Sajha" }] }),
  component: () => <AuthGate><Reports /></AuthGate>,
});

const CHART_COLORS = ["#0E7C61", "#F5A623", "#3B82F6", "#EF4444", "#8B5CF6", "#10B981", "#F472B6", "#64748B"];

function Reports() {
  const { group } = useSession();
  const [period, setPeriod] = useState<"month" | "year">("month");

  const { data: reports } = useQuery({
    queryKey: ["reports", group?.id, period],
    queryFn: () => api.getReports(group!.id, period),
    enabled: !!group,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members", group?.id],
    queryFn: () => api.getMembers(group!.id),
    enabled: !!group,
  });

  const categoryData = useMemo(() => {
    if (!reports) return [];
    return Object.entries(reports.byCategory).map(([name, value]) => ({ name, value: value as number }));
  }, [reports]);

  return (
    <AppShell title="Reports">
      <div className="px-4 pt-4">
        <div className="flex rounded-full bg-muted p-1 text-xs">
          {(["month", "year"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={
                "flex-1 rounded-full px-3 py-2 font-semibold capitalize transition " +
                (period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")
              }
            >
              This {p}
            </button>
          ))}
        </div>

        <section className="mt-4 rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]">
          <h2 className="text-sm font-semibold">Spending by category</h2>
          {categoryData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatNPR(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="py-8 text-center text-xs text-muted-foreground">No data</p>}
        </section>

        <section className="mt-4 rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]">
          <h2 className="text-sm font-semibold">Contributions vs Expenses · 6 months</h2>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={reports?.monthly ?? []} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="month" fontSize={11} stroke="currentColor" opacity={0.5} />
                <YAxis fontSize={10} stroke="currentColor" opacity={0.5} />
                <Tooltip formatter={(v: number) => formatNPR(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="contributions" stroke="#0E7C61" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expenses" stroke="#F5A623" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="mt-4 mb-6 rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]">
          <h2 className="text-sm font-semibold">Member contributions</h2>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart
                layout="vertical"
                data={members.map((m) => ({
                  name: m.user.name.split(" ")[0],
                  amount: period === "month" ? m.contributed_this_month : m.contributed_this_year,
                }))}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <XAxis type="number" fontSize={10} stroke="currentColor" opacity={0.5} />
                <YAxis type="category" dataKey="name" fontSize={11} stroke="currentColor" opacity={0.7} width={60} />
                <Tooltip formatter={(v: number) => formatNPR(v)} />
                <Bar dataKey="amount" fill="#0E7C61" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
