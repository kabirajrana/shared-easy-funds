import { Link } from "@tanstack/react-router";
import { IconBell } from "@tabler/icons-react";
import { useEffect, useMemo } from "react";
import { SajhaAvatar } from "@/components/ui/avatar";
import { BudgetBar } from "@/components/ui/BudgetBar";
import { Button } from "@/components/ui/button";
import { ExpenseItem } from "@/components/expenses/ExpenseItem";
import { useSession } from "@/lib/session";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useGroupStore } from "@/store/useGroupStore";
import { formatNPR } from "@/lib/utils";
import { InstallAppBanner } from "@/components/pwa/InstallAppBanner";
import type { User } from "@/types";

const EMPTY_MEMBERS: User[] = [];

export function HomePage() {
  const { user } = useSession();
  const activeGroupId = useGroupStore((state) => state.activeGroupId);
  const groups = useGroupStore((state) => state.groups);
  const expenses = useExpenseStore((state) => state.expenses);
  const hydrateWorkspace = useExpenseStore((state) => state.hydrateWorkspace);
  const groupMembers = useGroupStore((state) => state.groupMembers);
  const activeGroup = groups.find((group) => group.id === activeGroupId);
  const hasWorkspace = groups.length > 0 || expenses.length > 0;

  useEffect(() => {
    void hydrateWorkspace();
  }, [hydrateWorkspace]);

  const summary = useMemo(() => {
    const userId = user?.id ?? "u1";
    const relevant = activeGroup
      ? expenses.filter((expense) => expense.groupId === activeGroup.id)
      : expenses.filter(
          (expense) => expense.paidById === userId || expense.splits.some((split) => split.userId === userId),
        );
    const totalSpent = relevant.reduce((sum, expense) => sum + expense.amount, 0);
    const budget = activeGroup?.targetBudget ?? user?.monthlyBudget ?? 0;
    return {
      totalSpent,
      budget,
      budgetUsed: budget > 0 ? Math.round((totalSpent / budget) * 100) : 0,
    };
  }, [activeGroup, expenses, user?.id, user?.monthlyBudget]);
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
      <InstallAppBanner
        forceVisible
        autoHideMs={6000}
        className="fixed left-1/2 top-4 z-30 w-[min(92vw,28rem)] -translate-x-1/2 border-white/20"
      />
      <header className="sticky top-0 z-20 border-b border-[0.5px] border-[var(--saj-border)] bg-[var(--saj-surface)] px-4 py-4">
        <div className="flex items-center gap-3">
          <SajhaAvatar name={user?.name ?? "Ram Sharma"} src={user?.avatarImage} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-[var(--saj-text)]">
              Namaste, {user?.name.split(" ")[0] ?? "Ram"}
            </p>
            <p className="text-[11px] text-[var(--saj-muted)]">
              {hasWorkspace ? `${members.length} members in your active group` : "Set up your first group to start tracking together"}
            </p>
          </div>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full text-[var(--saj-muted)]">
            <IconBell className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="space-y-3 px-4 pb-20 pt-3">
        {!hasWorkspace ? (
          <section className="overflow-hidden rounded-[20px] border border-[var(--saj-border)] bg-[linear-gradient(135deg,rgba(26,107,90,0.96),rgba(23,51,43,0.98))] p-5 text-white shadow-[0_10px_28px_rgba(0,0,0,0.18)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">
              Getting started
            </p>
            <h2 className="mt-2 text-[1.35rem] font-bold leading-tight">
              Create your first group and set a target budget.
            </h2>
            <p className="mt-2 max-w-[18rem] text-[13px] leading-6 text-white/80">
              No shared data yet. Start by creating a group, picking your target, and inviting the people you want to split with.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button asChild className="h-11 rounded-[18px] bg-white text-[var(--saj-green)] hover:bg-white/95">
                <Link to="/groups/new">Create group</Link>
              </Button>
              <Button asChild variant="secondary" className="h-11 rounded-[18px] border-white/20 bg-white/10 text-white hover:bg-white/15">
                <Link to="/groups">Join with invite code</Link>
              </Button>
            </div>
            <div className="mt-4 rounded-2xl border border-white/15 bg-white/10 p-3">
              <p className="text-[12px] font-medium text-white">Join a shared workspace</p>
              <p className="mt-1 text-[11px] leading-5 text-white/75">
                Ask your group leader for an invite code, then join to see shared budgets, expenses, reports, and analytics.
              </p>
            </div>
          </section>
        ) : (
          <section className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--saj-muted)]">
              Target budget
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
                  {formatNPR(Math.max((summary.budget || 0) - summary.totalSpent, 0))}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <BudgetBar value={summary.budgetUsed} className="flex-1" />
              <span className="text-[11px] font-medium text-[var(--saj-green)]">{summary.budgetUsed}%</span>
            </div>
          </section>
        )}

        <section className="rounded-[12px] border border-[var(--saj-border)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="text-[14px] font-medium text-[var(--saj-text)]">Recent expenses</h2>
            <Link to="/analytics" className="text-[12px] font-medium text-[var(--saj-green)]">
              View analytics
            </Link>
          </div>
          <div className="mt-2 divide-y divide-[var(--saj-border-soft)]">
            {hasWorkspace && recentExpenses.length > 0 ? (
              recentExpenses.map((expense) => {
                const paidBy =
                  members.find((member) => member.id === expense.paidById) ?? (expense.paidById === user?.id ? user : undefined);
                return <ExpenseItem key={expense.id} expense={expense} paidBy={paidBy} />;
              })
            ) : (
              <div className="px-4 py-5 text-center">
                <p className="text-[13px] font-medium text-[var(--saj-text)]">
                  {hasWorkspace ? "No recent expenses" : "Nothing here yet"}
                </p>
                <p className="mt-1 text-[11px] text-[var(--saj-muted)]">
                  {hasWorkspace
                    ? "Expenses will appear here once you start adding activity."
                    : "Create a group from the Groups section to begin tracking shared spending."}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
