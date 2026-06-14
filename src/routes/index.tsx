import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wallet, Plus, HandCoins, Receipt } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGate } from "@/components/layout/AuthGate";
import { api } from "@/services/api";
import { categoryEmoji, formatNPR, useSession } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Home — Sajha" }] }),
  component: () => (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  ),
});

function Dashboard() {
  const { user, group, role } = useSession();
  const { data: txs = [] } = useQuery({
    queryKey: ["transactions", group?.id],
    queryFn: () => api.getTransactions(group!.id),
    enabled: !!group,
  });

  const now = new Date();
  const inMonth = (d: string, offset = 0) => {
    const x = new Date(d);
    const target = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return x.getMonth() === target.getMonth() && x.getFullYear() === target.getFullYear();
  };

  const thisMonth = txs.filter((t) => inMonth(t.date));
  const lastMonth = txs.filter((t) => inMonth(t.date, 1));
  const contribMonth = thisMonth.filter((t) => t.type === "contribution").reduce((s, t) => s + t.amount, 0);
  const expenseMonth = thisMonth.filter((t) => t.type === "expense" && t.status === "approved").reduce((s, t) => s + t.amount, 0);
  const expenseLast = lastMonth.filter((t) => t.type === "expense" && t.status === "approved").reduce((s, t) => s + t.amount, 0);
  const totalContrib = txs.filter((t) => t.type === "contribution").reduce((s, t) => s + t.amount, 0);
  const totalApprovedExp = txs.filter((t) => t.type === "expense" && t.status === "approved").reduce((s, t) => s + t.amount, 0);
  const balance = totalContrib - totalApprovedExp;

  const pct = expenseLast === 0 ? 0 : Math.round(((expenseMonth - expenseLast) / expenseLast) * 100);
  const pendingCount = txs.filter((t) => t.status === "pending").length;
  const recent = txs.slice(0, 5);

  return (
    <AppShell title={group?.name ?? "Sajha"}>
      <div className="px-4 pt-4">
        <p className="text-xs text-muted-foreground">Hello, {user?.name.split(" ")[0]} 👋</p>
      </div>

      <section className="mx-4 mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-[var(--shadow-pop)]">
        <div className="flex items-center gap-2 text-xs opacity-90">
          <Wallet className="h-4 w-4" />
          Fund balance
        </div>
        <div className="mt-1 text-3xl font-extrabold tracking-tight">{formatNPR(balance)}</div>
        <div className="mt-1 text-[11px] opacity-80">
          Monthly target {formatNPR(group?.monthly_target ?? 0)}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
            <div className="flex items-center gap-1 text-[11px] opacity-90">
              <ArrowDownRight className="h-3 w-3" /> Contributed
            </div>
            <div className="mt-0.5 text-lg font-bold">{formatNPR(contribMonth)}</div>
            <div className="text-[10px] opacity-80">this month</div>
          </div>
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
            <div className="flex items-center gap-1 text-[11px] opacity-90">
              <ArrowUpRight className="h-3 w-3" /> Spent
            </div>
            <div className="mt-0.5 text-lg font-bold">{formatNPR(expenseMonth)}</div>
            <div className="flex items-center gap-1 text-[10px] opacity-80">
              {pct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {pct === 0 ? "—" : `${pct > 0 ? "+" : ""}${pct}% vs last`}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-3 gap-2 px-4">
        <QuickAction to="/add?type=expense" icon={Receipt} label="Add expense" />
        <QuickAction to="/add?type=contribution" icon={HandCoins} label="Contribute" />
        <QuickAction to="/add?type=request" icon={Plus} label="Request" />
      </section>

      {role === "leader" && pendingCount > 0 && (
        <Link to="/approvals" className="mx-4 mt-4 flex items-center justify-between rounded-2xl border border-warning/40 bg-warning/10 p-3">
          <div>
            <div className="text-sm font-semibold text-warning-foreground">{pendingCount} pending request{pendingCount > 1 ? "s" : ""}</div>
            <div className="text-xs text-warning-foreground/80">Tap to review and approve</div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-warning-foreground" />
        </Link>
      )}

      <section className="mt-6 px-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <Link to="/transactions" className="text-xs font-medium text-primary">See all</Link>
        </div>
        <div className="space-y-2">
          {recent.map((t) => {
            const u = api.getUserById(t.created_by);
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-[var(--shadow-card)]">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-lg">{categoryEmoji(t.category)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{t.description || t.category}</p>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {u?.name.split(" ")[0]} · {new Date(t.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="text-right">
                  <div className={"text-sm font-bold " + (t.type === "contribution" ? "text-success" : "text-foreground")}>
                    {t.type === "contribution" ? "+" : "−"}{formatNPR(t.amount)}
                  </div>
                  <div className="mt-1"><StatusBadge status={t.status} /></div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to as any} className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-card p-3 shadow-[var(--shadow-card)] active:scale-95 transition">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-[11px] font-semibold">{label}</span>
    </Link>
  );
}
