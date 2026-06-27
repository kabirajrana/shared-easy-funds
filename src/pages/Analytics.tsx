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
import { CATEGORY_CONFIG } from "@/lib/categories";
import { formatNPR } from "@/lib/utils";
import { CategoryIcon } from "@/components/expenses/CategoryIcon";
import { Button } from "@/components/ui/button";
import type { ExpenseCategory } from "@/types";
import { exportCsv, exportExcel } from "@/utils/export";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useSession } from "@/lib/session";

export function AnalyticsPage() {
  const { user } = useSession();
  const expenses = useExpenseStore((state) => state.expenses);
  const [monthIndex, setMonthIndex] = useState(() => new Date().getMonth());
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const today = new Date();
  const selectedYear = today.getFullYear();
  const selectedMonthLabel = new Date(selectedYear, monthIndex, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  const userId = user?.id ?? "";
  const budget = user?.monthlyBudget ?? 0;

  const selectedMonthExpenses = useMemo(() => {
    if (!userId) return [];

    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      const isSelectedMonth = expenseDate.getFullYear() === selectedYear && expenseDate.getMonth() === monthIndex;
      const isRelevant = expense.paidById === userId || expense.splits.some((split) => split.userId === userId);
      return isSelectedMonth && isRelevant;
    });
  }, [expenses, monthIndex, selectedYear, userId]);

  const categoryData = useMemo(() => {
    const totals = new Map<ExpenseCategory, number>();

    for (const expense of selectedMonthExpenses) {
      if (expense.type === "income") continue;
      totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount);
    }

    return [...totals.entries()]
      .map(([category, value]) => ({
        name: CATEGORY_CONFIG[category].label,
        value,
        category,
        color: CATEGORY_CONFIG[category].color,
      }))
      .sort((a, b) => b.value - a.value);
  }, [selectedMonthExpenses]);

  const dailyData = useMemo(() => {
    const totals = new Map<number, number>();

    for (const expense of selectedMonthExpenses) {
      if (expense.type === "income") continue;
      const day = new Date(expense.date).getDate();
      totals.set(day, (totals.get(day) ?? 0) + expense.amount);
    }

    return [...totals.entries()]
      .map(([day, value]) => ({
        day: String(day),
        value,
      }))
      .sort((a, b) => Number(a.day) - Number(b.day));
  }, [selectedMonthExpenses]);

  const summary = useMemo(() => {
    const income = selectedMonthExpenses
      .filter((expense) => expense.type === "income")
      .reduce((sum, expense) => sum + expense.amount, 0);
    const spent = selectedMonthExpenses
      .filter((expense) => expense.type !== "income")
      .reduce((sum, expense) => sum + expense.amount, 0);

    return {
      income,
      spent,
      remaining: Math.max(budget - spent, 0),
    };
  }, [budget, selectedMonthExpenses]);

  const totalCategory = categoryData.reduce((sum, item) => sum + item.value, 0);
  const hasAnalyticsData = categoryData.length > 0 || dailyData.length > 0;
  const fileBase = `sajha-analytics-${selectedMonthLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;

  const exportRows = useMemo(() => {
    return [
      ["Sajha analytics export"],
      ["Month", selectedMonthLabel],
      [""],
      ["Summary"],
      ["Metric", "Value"],
      ["Collected", summary.income],
      ["Total spent", summary.spent],
      ["Budget", budget],
      ["Remaining", summary.remaining],
      [""],
      ["Category breakdown"],
      ["Category", "Amount"],
      ...categoryData.map((entry) => [entry.name, entry.value]),
      [""],
      ["Daily spending"],
      ["Day", "Amount"],
      ...dailyData.map((entry) => [entry.day, entry.value]),
    ];
  }, [budget, categoryData, dailyData, selectedMonthLabel, summary.income, summary.remaining, summary.spent]);

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
              {monthNames[monthIndex]} {selectedYear}
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
          <StatCard label="Spent" value={formatNPR(summary.spent)} color="#E24B4A" />
          <StatCard label="Collected" value={formatNPR(summary.income)} color="#1D9E75" />
          <StatCard label="Remaining" value={formatNPR(summary.remaining)} color="#0F6E56" />
        </section>

        <section className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <h2 className="text-[14px] font-medium text-[var(--saj-text)]">Spending by category</h2>
          {hasAnalyticsData ? (
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
          ) : (
            <EmptyAnalyticsState
              title="No category data yet"
              description="Add your first expense and the chart will show how spending is split across categories."
            />
          )}
        </section>

        <section className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <h2 className="text-[14px] font-medium text-[var(--saj-text)]">Daily spending</h2>
          {hasAnalyticsData ? (
            <div className="mt-3 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#aaa" }} />
                  <YAxis hide />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#0F6E56" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyAnalyticsState
              title="No daily spending yet"
              description="Once expenses are added, you'll see a day-by-day breakdown for the selected month."
            />
          )}
        </section>

        <section className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <h2 className="text-[14px] font-medium text-[var(--saj-text)]">Category breakdown</h2>
          {hasAnalyticsData ? (
            <div className="mt-3 space-y-3">
              {categoryData.map((entry) => {
                const percent = totalCategory > 0 ? Math.round((entry.value / totalCategory) * 100) : 0;
                return (
                  <div key={entry.name} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="grid h-8 w-8 place-items-center rounded-full"
                          style={{ background: `${entry.color}15`, color: entry.color }}
                        >
                          <CategoryIcon category={entry.category} className="h-4 w-4" />
                        </div>
                        <span className="text-[13px] font-medium text-[var(--saj-text)]">{entry.name}</span>
                      </div>
                      <span className="text-[12px] text-[var(--saj-muted)]">
                        {formatNPR(entry.value)} - {percent}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#eef2ef]">
                      <div className="h-full rounded-full" style={{ width: `${percent}%`, background: entry.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyAnalyticsState
              title="Nothing to break down yet"
              description="Your category list will populate automatically after the first expense is saved."
            />
          )}
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

function EmptyAnalyticsState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-3 rounded-[12px] border border-dashed border-[var(--saj-border)] bg-[var(--saj-green-pale)] px-4 py-8 text-center">
      <p className="text-[13px] font-medium text-[var(--saj-text)]">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[11px] leading-5 text-[var(--saj-muted)]">{description}</p>
    </div>
  );
}
