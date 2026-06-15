import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Wallet, Plus, HandCoins, Receipt, Check, Download, X, Pencil,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGate } from "@/components/layout/AuthGate";
import { api, type MemberWithUser } from "@/services/api";
import { categoryEmoji, formatNPR, useSession } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Home — FlatTrack" }] }),
  component: () => (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  ),
});

const LS_TARGET = "flat_monthly_target";
const LS_SPLIT = "flat_split_members"; // JSON: string[] user_ids
const LS_INSTALL_DISMISSED = "flat_install_dismissed";

const AVATAR_COLORS = ["#1B4D3E", "#0F6E56", "#B36A3B", "#5C4B8A", "#A33A55", "#2F6FB4"];
function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function Dashboard() {
  const { user, group, role } = useSession();
  const { data: txs = [] } = useQuery({
    queryKey: ["transactions", group?.id],
    queryFn: () => api.getTransactions(group!.id),
    enabled: !!group,
  });
  const { data: members = [] } = useQuery({
    queryKey: ["members", group?.id],
    queryFn: () => api.getMembers(group!.id),
    enabled: !!group,
  });

  // ---- localStorage state ----
  const [target, setTarget] = useState<number | null>(null);
  const [splitIds, setSplitIds] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const t = localStorage.getItem(LS_TARGET);
    if (t) setTarget(Number(t));
    const s = localStorage.getItem(LS_SPLIT);
    if (s) {
      try { setSplitIds(JSON.parse(s)); } catch {}
    }
    setInstallDismissed(localStorage.getItem(LS_INSTALL_DISMISSED) === "1");

    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Default split = all members once loaded, if no saved split
  useEffect(() => {
    if (members.length && splitIds.length === 0 && !localStorage.getItem(LS_SPLIT)) {
      setSplitIds(members.map((m) => m.user.id));
    }
  }, [members, splitIds.length]);

  // ---- derive metrics ----
  const now = new Date();
  const inMonth = (d: string, offset = 0) => {
    const x = new Date(d);
    const t = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return x.getMonth() === t.getMonth() && x.getFullYear() === t.getFullYear();
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

  const share = target && splitIds.length > 0 ? Math.round(target / splitIds.length) : 0;
  const paidMembers = members.filter((m) => m.contributed_this_month >= share && share > 0).length;
  const fillPct = target ? Math.min(100, Math.round((contribMonth / target) * 100)) : 0;
  const spendPct = target ? Math.min(100, Math.round((expenseMonth / target) * 100)) : 0;

  const monthLabel = now.toLocaleString("en", { month: "long", year: "numeric" });

  return (
    <AppShell title={group?.name ?? "FlatTrack"}>
      <div className="px-4 pt-4">
        <p className="text-xs text-muted-foreground">Hello, {user?.name.split(" ")[0]} 👋</p>
      </div>

      {/* ===== Fund balance header ===== */}
      <section className="mx-4 mt-3 overflow-hidden rounded-2xl p-5 text-white shadow-[var(--shadow-pop)]" style={{ background: "#1B4D3E" }}>
        {target === null ? (
          <EmptyTargetState onSetup={() => setSheetOpen(true)} />
        ) : (
          <FullBalanceHeader
            balance={balance}
            target={target}
            fillPct={fillPct}
            contribMonth={contribMonth}
            expenseMonth={expenseMonth}
            pct={pct}
            spendPct={spendPct}
            paidMembers={paidMembers}
            totalMembers={splitIds.length || members.length}
            onEdit={() => setSheetOpen(true)}
          />
        )}
      </section>

      {/* ===== Action buttons ===== */}
      <section className="mt-5 grid grid-cols-3 gap-2 px-4">
        <QuickAction to="/add?type=expense" icon={Receipt} label="Add expense" />
        <QuickAction to="/add?type=contribution" icon={HandCoins} label="Contribute" />
        <QuickAction to="/add?type=request" icon={Plus} label="Request" />
      </section>

      {/* ===== Install banner ===== */}
      {!installDismissed && (
        <InstallBanner
          installPrompt={installPrompt}
          onDismiss={() => {
            localStorage.setItem(LS_INSTALL_DISMISSED, "1");
            setInstallDismissed(true);
          }}
        />
      )}

      {/* ===== Member contributions ===== */}
      {target !== null && (
        <section className="mx-4 mt-4 rounded-xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]" style={{ borderWidth: 0.5 }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Member contributions</h2>
            <span className="text-[11px] text-muted-foreground">{monthLabel}</span>
          </div>
          <div className="space-y-3">
            {members.map((m) => {
              const included = splitIds.includes(m.user.id);
              const memberShare = included ? share : 0;
              const paid = m.contributed_this_month;
              const isPaid = memberShare > 0 && paid >= memberShare;
              const memberPct = memberShare > 0 ? Math.min(100, Math.round((paid / memberShare) * 100)) : 0;
              return (
                <div key={m.user.id} className="flex items-center gap-3">
                  <div
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                    style={{ background: avatarColor(m.user.id) }}
                  >
                    {m.user.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{m.user.name.split(" ")[0]}</p>
                      <span className={cn("text-xs font-semibold tabular-nums flex items-center gap-1",
                        isPaid ? "text-[#0F6E56]" : "text-[#C2410C]")}>
                        {isPaid ? <Check className="h-3.5 w-3.5" /> : null}
                        {isPaid ? formatNPR(paid) : (included ? "pending" : "—")}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: included ? `${memberPct}%` : "0%",
                          background: isPaid ? "#9FE1CB" : (included ? "#F0997B" : "transparent"),
                          minWidth: included && memberPct === 0 ? "100%" : undefined,
                          backgroundColor: included && memberPct === 0 ? "#F0997B" : undefined,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== Pending requests banner ===== */}
      {role === "leader" && pendingCount > 0 && (
        <Link to="/approvals" className="mx-4 mt-4 flex items-center justify-between rounded-2xl border border-warning/40 bg-warning/10 p-3">
          <div>
            <div className="text-sm font-semibold text-warning-foreground">{pendingCount} pending request{pendingCount > 1 ? "s" : ""}</div>
            <div className="text-xs text-warning-foreground/80">Tap to review and approve</div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-warning-foreground" />
        </Link>
      )}

      {/* ===== Recent activity ===== */}
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
                  <p className="truncate text-sm font-semibold">{t.description || t.category}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {u?.name.split(" ")[0]} · {new Date(t.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="text-right">
                  <div className={"text-sm font-bold " + (t.type === "contribution" ? "text-[#0F6E56]" : "text-foreground")}>
                    {t.type === "contribution" ? "+" : "−"}{formatNPR(t.amount)}
                  </div>
                  <div className="mt-1"><StatusBadge status={t.status} /></div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== Target setup sheet ===== */}
      <TargetSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialAmount={target}
        initialSplitIds={splitIds}
        members={members}
        onConfirm={(amount, ids) => {
          localStorage.setItem(LS_TARGET, String(amount));
          localStorage.setItem(LS_SPLIT, JSON.stringify(ids));
          setTarget(amount);
          setSplitIds(ids);
          setSheetOpen(false);
        }}
      />
    </AppShell>
  );
}

// ---------- subcomponents ----------

function EmptyTargetState({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-white/10">
        <Wallet className="h-6 w-6" />
      </div>
      <p className="text-sm text-white/90 max-w-[18rem]">
        No monthly target set yet. Set one to start tracking contributions.
      </p>
      <button
        onClick={onSetup}
        className="mt-1 rounded-full px-4 py-2 text-sm font-semibold"
        style={{ background: "#9FE1CB", color: "#04342C" }}
      >
        Set up fund target
      </button>
    </div>
  );
}

function FullBalanceHeader({
  balance, target, fillPct, contribMonth, expenseMonth, pct, spendPct, paidMembers, totalMembers, onEdit,
}: {
  balance: number; target: number; fillPct: number; contribMonth: number;
  expenseMonth: number; pct: number; spendPct: number; paidMembers: number; totalMembers: number;
  onEdit: () => void;
}) {
  const negative = balance < 0;
  return (
    <>
      <div className="flex items-center gap-2 text-xs opacity-90">
        <Wallet className="h-4 w-4" /> Fund balance
      </div>
      <div className="mt-1 text-3xl font-extrabold tracking-tight" style={{ color: negative ? "#F0997B" : "#9FE1CB" }}>
        {negative ? "−" : ""}{formatNPR(Math.abs(balance))}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="text-[11px] opacity-80">Monthly target: {formatNPR(target)}</div>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium hover:bg-white/20"
        >
          <Pencil className="h-3 w-3" /> Edit target
        </button>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full" style={{ width: `${fillPct}%`, background: "#9FE1CB" }} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
          <div className="flex items-center gap-1 text-[11px] opacity-90">
            <ArrowDownRight className="h-3 w-3" /> Contributed this month
          </div>
          <div className="mt-0.5 text-lg font-bold">{formatNPR(contribMonth)}</div>
          <div className="text-[10px] opacity-80">{paidMembers} of {totalMembers} members paid</div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full" style={{ width: `${fillPct}%`, background: "#9FE1CB" }} />
          </div>
        </div>
        <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
          <div className="flex items-center gap-1 text-[11px] opacity-90">
            <ArrowUpRight className="h-3 w-3" /> Spent this month
          </div>
          <div className="mt-0.5 text-lg font-bold">{formatNPR(expenseMonth)}</div>
          <div className="flex items-center gap-1 text-[10px] opacity-80">
            {pct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {pct === 0 ? "—" : `${pct > 0 ? "+" : ""}${pct}% vs last`}
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full" style={{ width: `${spendPct}%`, background: "#F0997B" }} />
          </div>
        </div>
      </div>
    </>
  );
}

function InstallBanner({ installPrompt, onDismiss }: { installPrompt: any; onDismiss: () => void }) {
  const handleInstall = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (installPrompt) {
      installPrompt.prompt();
      try { await installPrompt.userChoice; } catch {}
    }
    onDismiss();
  };
  return (
    <div
      onClick={onDismiss}
      className="mx-4 mt-4 flex cursor-pointer items-center gap-3 rounded-xl border p-3"
      style={{ background: "#E6F1FB", borderColor: "#B5D4F4", borderWidth: 0.5 }}
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#1E40AF]">
        <Download className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#0B2545]">Add to Home Screen</p>
        <p className="truncate text-[11px] text-[#0B2545]/70">Install app for quick access & offline use</p>
      </div>
      <Button size="sm" onClick={handleInstall} className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white">
        Install
      </Button>
      <button
        aria-label="Dismiss"
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className="grid h-7 w-7 place-items-center rounded-full text-[#0B2545]/60 hover:bg-white/60"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function TargetSheet({
  open, onOpenChange, initialAmount, initialSplitIds, members, onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialAmount: number | null;
  initialSplitIds: string[];
  members: MemberWithUser[];
  onConfirm: (amount: number, ids: string[]) => void;
}) {
  const [amount, setAmount] = useState<string>("");
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setAmount(initialAmount ? String(initialAmount) : "");
      setIds(initialSplitIds.length ? initialSplitIds : members.map((m) => m.user.id));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const amountNum = Number(amount) || 0;
  const share = useMemo(
    () => (amountNum && ids.length ? Math.round(amountNum / ids.length) : 0),
    [amountNum, ids.length],
  );

  const toggle = (id: string) => {
    setIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const valid = amountNum > 0 && ids.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-0 p-0 max-h-[90dvh] overflow-y-auto"
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        <div className="px-5 pb-6 pt-3">
          <SheetHeader className="text-left">
            <SheetTitle>Set fund target</SheetTitle>
            <SheetDescription>How much should the group collect each month?</SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-5">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Monthly target amount</label>
              <div className="mt-1.5 flex items-center rounded-xl border border-border/60 bg-card px-3 focus-within:ring-2 focus-within:ring-primary/40">
                <span className="text-sm font-semibold text-muted-foreground">NPR</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 40000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="border-0 bg-transparent text-base font-semibold focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">Split equally among members</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {members.map((m) => {
                  const active = ids.includes(m.user.id);
                  return (
                    <button
                      key={m.user.id}
                      onClick={() => toggle(m.user.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                        active
                          ? "border-transparent text-white"
                          : "border-border bg-card text-foreground"
                      )}
                      style={active ? { background: "#1B4D3E" } : {}}
                    >
                      {active && <Check className="h-3 w-3" />}
                      {m.user.name.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Each member's share:{" "}
                <span className="font-semibold text-foreground">{formatNPR(share)}</span>
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 text-white"
                style={{ background: "#1B4D3E" }}
                disabled={!valid}
                onClick={() => onConfirm(amountNum, ids)}
              >
                Confirm target
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
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
