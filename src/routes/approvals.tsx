import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGate } from "@/components/layout/AuthGate";
import { api } from "@/services/api";
import { categoryEmoji, formatNPR, useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/approvals")({
  component: () => <AuthGate><Approvals /></AuthGate>,
});

function Approvals() {
  const { group, role } = useSession();
  const qc = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  if (role && role !== "leader") {
    return <Navigate to="/" replace />;
  }

  const { data: txs = [] } = useQuery({
    queryKey: ["transactions", group?.id],
    queryFn: () => api.getTransactions(group!.id),
    enabled: !!group,
  });

  const pending = txs.filter((t) => t.type === "expense" && t.status === "pending");

  const onApprove = async (id: string) => {
    await api.approveTransaction(id);
    qc.invalidateQueries({ queryKey: ["transactions"] });
    toast.success("Approved");
  };
  const onReject = async () => {
    if (!rejectId) return;
    await api.rejectTransaction(rejectId, reason);
    qc.invalidateQueries({ queryKey: ["transactions"] });
    toast.success("Rejected");
    setRejectId(null);
    setReason("");
  };

  return (
    <AppShell title="Pending approvals" back hideNav>
      <div className="space-y-3 px-4 pt-4">
        {pending.length === 0 && (
          <div className="rounded-2xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
            All caught up — no pending requests.
          </div>
        )}
        {pending.map((t) => {
          const u = api.getUserById(t.created_by);
          return (
            <div key={t.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-muted text-xl">{categoryEmoji(t.category)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{t.description || t.category}</p>
                    <span className="shrink-0 text-base font-extrabold">{formatNPR(t.amount)}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {u?.name} · {t.category} · {new Date(t.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => setRejectId(t.id)}>
                  <X className="mr-1 h-4 w-4" /> Reject
                </Button>
                <Button onClick={() => onApprove(t.id)} className="bg-success text-success-foreground hover:bg-success/90">
                  <Check className="mr-1 h-4 w-4" /> Approve
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject request</DialogTitle></DialogHeader>
          <Textarea placeholder="Optional reason…" value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={onReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
