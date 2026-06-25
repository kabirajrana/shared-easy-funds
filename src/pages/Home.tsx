import { Link } from "@tanstack/react-router";
import { IconBell } from "@tabler/icons-react";
import { useMemo } from "react";
import { SajhaAvatar } from "@/components/ui/avatar";
import { BudgetBar } from "@/components/ui/BudgetBar";
import { ExpenseItem } from "@/components/expenses/ExpenseItem";
import { useSession } from "@/lib/session";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useGroupStore } from "@/store/useGroupStore";
import { formatNPR } from "@/lib/utils";

const EMPTY_MEMBERS: readonly unknown[] = [];

export function HomePage() {
  const { user } = useSession();
  const activeGroupId = useGroupStore((state) => state.activeGroupId);
  const expenses = useExpenseStore((state) => state.expenses);
  const groupMembers = useGroupStore((state) => state.groupMembers);
  const summary = useMemo(() => {
    const userId = user?.id ?? "u1";
    const relevant = expenses.filter(
      (expense) => expense.paidById === userId || expense.splits.some((split) => split.userId === userId),
    );
    const totalSpent = relevant.reduce((sum, expense) => sum + expense.amount, 0);
    const budget = 45000;
    return {
      totalSpent,
      budget,
      budgetUsed: Math.round((totalSpent / budget) * 100),
    };
  }, [expenses, user?.id]);
  const members = groupMembers[activeGroupId] ?? EMPTY_MEMBERS;

  const recentExpenses = useMemo(
    () =>
      [...expenses]
        .filter((expense) => expense.paidById === user?.id || expense.groupId === activeGroupId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [activeGroupId, expenses, user?.id],
  );

  return (
    <div className="min-h-full bg-[var(--saj-bg)]">
      <header className="sticky top-0 z-20 border-b border-[0.5px] border-[var(--saj-border)] bg-[var(--saj-surface)] px-4 py-4">
        <div className="flex items-center gap-3">
          <SajhaAvatar name={user?.name ?? "Ram Sharma"} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-[var(--saj-text)]">
              Namaste, {user?.name.split(" ")[0] ?? "Ram"}
            </p>
            <p className="text-[11px] text-[var(--saj-muted)]">
              {members.length} members in your active group
            </p>
          </div>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full text-[var(--saj-muted)]">
            <IconBell className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="space-y-3 px-4 pb-20 pt-3">
        <section className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--saj-muted)]">
            Monthly summary
          </p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] text-[var(--saj-muted)]">Total spent</p>
              <p className="text-[28px] font-semibold text-[var(--saj-text)]">
                {formatNPR(summary.totalSpent)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-[var(--saj-muted)]">Budget left</p>
              <p className="text-[18px] font-semibold text-[var(--saj-green)]">
                {formatNPR(Math.max(summary.budget - summary.totalSpent, 0))}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <BudgetBar value={summary.budgetUsed} className="flex-1" />
            <span className="text-[11px] font-medium text-[var(--saj-green)]">{summary.budgetUsed}%</span>
          </div>
        </section>

        <section className="rounded-[12px] border border-[var(--saj-border)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="text-[14px] font-medium text-[var(--saj-text)]">Recent expenses</h2>
            <Link to="/analytics" className="text-[12px] font-medium text-[var(--saj-green)]">
              View analytics
            </Link>
          </div>
          <div className="mt-2 divide-y divide-[var(--saj-border-soft)]">
            {recentExpenses.map((expense) => (
              <ExpenseItem
                key={expense.id}
                expense={expense}
                paidBy={user}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
