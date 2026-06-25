import { useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CATEGORY_CONFIG } from "@/lib/categories";
import { formatNPR } from "@/lib/utils";
import { mockAnalyticsSummary, mockCategorySpending, mockDailySpending } from "@/services/mock";
import { CategoryIcon } from "@/components/expenses/CategoryIcon";
import { Button } from "@/components/ui/button";
import type { ExpenseCategory } from "@/types";
import { exportCsv, exportExcel } from "@/utils/export";

export function AnalyticsPage() {
  const [monthIndex, setMonthIndex] = useState(6);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const categoryData = useMemo(
    () =>
      mockCategorySpending.map((entry) => ({
        name: CATEGORY_CONFIG[entry.category as keyof typeof CATEGORY_CONFIG].label,
        value: entry.amount,
        category: entry.category,
        color: CATEGORY_CONFIG[entry.category as keyof typeof CATEGORY_CONFIG].color,
      })),
    [],
  );
  const totalCategory = categoryData.reduce((sum, item) => sum + item.value, 0);

  const dailyData = useMemo(
    () => mockDailySpending.map((entry) => ({ day: entry.day, value: entry.amount })),
    [],
  );

  const exportRows = useMemo(() => {
    const collected = mockAnalyticsSummary.totalIncome;
    const remaining = Math.max(mockAnalyticsSummary.budget - mockAnalyticsSummary.totalSpent, 0);

    return [
      ["Sajha analytics export"],
      ["Month", mockAnalyticsSummary.month],
      [""],
      ["Summary"],
      ["Metric", "Value"],
      ["Collected", collected],
      ["Total spent", mockAnalyticsSummary.totalSpent],
      ["Budget", mockAnalyticsSummary.budget],
      ["Remaining", remaining],
      [""],
      ["Category breakdown"],
      ["Category", "Amount"],
      ...categoryData.map((entry) => [entry.name, entry.value]),
      [""],
      ["Daily spending"],
      ["Day", "Amount"],
      ...dailyData.map((entry) => [entry.day, entry.value]),
    ];
  }, [categoryData, dailyData]);

  const fileBase = `sajha-analytics-${mockAnalyticsSummary.month.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;

  return (
    <div className="pb-20">
      <header className="sticky top-0 z-20 border-b border-[0.5px] border-[var(--saj-border)] bg-white px-4 py-[14px]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonthIndex((value) => (value === 0 ? 11 : value - 1))}
            className="grid h-9 w-9 place-items-center rounded-full border border-[var(--saj-border)] text-[var(--saj-green)]"
            aria-label="Previous month"
          >
            <IconChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-medium text-[var(--saj-text)]">Analytics</p>
            <p className="text-[11px] text-[var(--saj-muted)]">
              {monthNames[monthIndex]} 2025
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMonthIndex((value) => (value === 11 ? 0 : value + 1))}
            className="grid h-9 w-9 place-items-center rounded-full border border-[var(--saj-border)] text-[var(--saj-green)]"
            aria-label="Next month"
          >
            <IconChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 px-4 pt-3">
        <Button type="button" variant="outline" onClick={() => exportCsv(fileBase, exportRows)}>
          Export CSV
        </Button>
        <Button type="button" variant="outline" onClick={() => exportExcel(fileBase, exportRows)}>
          Export Excel
        </Button>
      </div>

      <main className="space-y-3 px-4 pt-3">
        <section className="grid grid-cols-3 gap-2">
          <StatCard label="Spent" value={formatNPR(mockAnalyticsSummary.totalSpent)} color="#E24B4A" />
          <StatCard label="Collected" value={formatNPR(mockAnalyticsSummary.totalIncome)} color="#1D9E75" />
          <StatCard
            label="Remaining"
            value={formatNPR(Math.max(mockAnalyticsSummary.budget - mockAnalyticsSummary.totalSpent, 0))}
            color="#0F6E56"
          />
        </section>

        <section className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <h2 className="text-[14px] font-medium text-[var(--saj-text)]">Spending by category</h2>
          <div className="mt-3 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={84} paddingAngle={2}>
                  {categoryData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <h2 className="text-[14px] font-medium text-[var(--saj-text)]">Daily spending</h2>
          <div className="mt-3 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#aaa" }} />
                <YAxis hide />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#0F6E56" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <h2 className="text-[14px] font-medium text-[var(--saj-text)]">Category breakdown</h2>
          <div className="mt-3 space-y-3">
            {categoryData.map((entry) => {
              const percent = Math.round((entry.value / totalCategory) * 100);
              return (
                <div key={entry.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-full" style={{ background: `${entry.color}15`, color: entry.color }}>
                        <CategoryIcon category={entry.category as ExpenseCategory} className="h-4 w-4" />
                      </div>
                      <span className="text-[13px] font-medium text-[var(--saj-text)]">{entry.name}</span>
                    </div>
                    <span className="text-[12px] text-[var(--saj-muted)]">
                      {formatNPR(entry.value)} · {percent}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#eef2ef]">
                    <div className="h-full rounded-full" style={{ width: `${percent}%`, background: entry.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex-1 rounded-[10px] bg-[#f5f5f0] px-3 py-[10px]">
      <p className="mb-0.5 text-[11px] text-[#888]">{label}</p>
      <p className="text-[15px] font-medium" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
