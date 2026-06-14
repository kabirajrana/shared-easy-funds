import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGate } from "@/components/layout/AuthGate";
import { api, EXPENSE_CATEGORIES } from "@/services/api";
import { categoryEmoji, formatNPR, useSession } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/transactions")({
  head: () => ({ meta: [{ title: "Transactions — Sajha" }] }),
  component: () => <AuthGate><TxList /></AuthGate>,
});

function TxList() {
  const { group } = useSession();
  const { data: txs = [] } = useQuery({
    queryKey: ["transactions", group?.id],
    queryFn: () => api.getTransactions(group!.id),
    enabled: !!group,
  });

  const [type, setType] = useState<"all" | "expense" | "contribution">("all");
  const [cat, setCat] = useState<string>("all");
  const [member, setMember] = useState<string>("all");

  const filtered = useMemo(() => {
    return txs.filter((t) => {
      if (type !== "all" && t.type !== type) return false;
      if (cat !== "all" && t.category !== cat) return false;
      if (member !== "all" && t.created_by !== member) return false;
      return true;
    });
  }, [txs, type, cat, member]);

  const members = api.allUsers();

  return (
    <AppShell title="Transactions">
      <div className="space-y-2 px-4 pt-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", "expense", "contribution"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition " +
                (type === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground")
              }
            >
              {t}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              <SelectItem value="Contribution">Contribution</SelectItem>
            </SelectContent>
          </Select>
          <Select value={member} onValueChange={setMember}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All members</SelectItem>
              {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 space-y-2 px-4">
        {filtered.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No transactions match.</p>}
        {filtered.map((t) => {
          const u = api.getUserById(t.created_by);
          return (
            <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-[var(--shadow-card)]">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-lg">{categoryEmoji(t.category)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t.description || t.category}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {t.category} · {u?.name.split(" ")[0]} · {new Date(t.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
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
    </AppShell>
  );
}
