import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGate } from "@/components/layout/AuthGate";
import { api } from "@/services/api";
import { formatNPR, useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Copy, Crown, QrCode, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export const Route = createFileRoute("/group")({
  head: () => ({ meta: [{ title: "Group — Sajha" }] }),
  component: () => <AuthGate><GroupPage /></AuthGate>,
});

function GroupPage() {
  const { group, role, user, setRoleAs } = useSession();
  const qc = useQueryClient();
  const { data: members = [] } = useQuery({
    queryKey: ["members", group?.id],
    queryFn: () => api.getMembers(group!.id),
    enabled: !!group,
  });

  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmTransfer, setConfirmTransfer] = useState<string | null>(null);

  const copyInvite = () => {
    navigator.clipboard.writeText(group!.invite_code);
    toast.success("Invite code copied");
  };

  const doTransfer = async () => {
    if (!confirmTransfer) return;
    await api.transferLeader(group!.id, confirmTransfer);
    qc.invalidateQueries({ queryKey: ["members"] });
    if (user) setRoleAs(user.id);
    toast.success("Leadership transferred");
    setConfirmTransfer(null);
  };

  const doRemove = async () => {
    if (!confirmRemove) return;
    await api.removeMember(group!.id, confirmRemove);
    qc.invalidateQueries({ queryKey: ["members"] });
    toast.success("Member removed");
    setConfirmRemove(null);
  };

  return (
    <AppShell title={group?.name ?? "Group"}>
      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Invite code</p>
              <p className="truncate font-mono text-lg font-bold tracking-wider">{group?.invite_code}</p>
            </div>
            <Button variant="outline" size="sm" onClick={copyInvite}><Copy className="mr-1 h-4 w-4" /> Copy</Button>
          </div>
        </div>

        <Link to="/qr" className="mt-3 flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <QrCode className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Payment QR</p>
            <p className="text-xs text-muted-foreground">{group?.qr_label ?? "Set up payment QR"}</p>
          </div>
        </Link>

        <h2 className="mt-6 mb-2 text-sm font-semibold">Members ({members.length})</h2>
        <div className="space-y-2">
          {members.map(({ membership, user: u, contributed_this_month, contributed_this_year }) => (
            <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-[var(--shadow-card)]">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {u.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{u.name}</p>
                  {membership.role === "leader" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      <Crown className="h-3 w-3" /> LEADER
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">MEMBER</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {formatNPR(contributed_this_month)} this month · {formatNPR(contributed_this_year)} this year
                </p>
              </div>
              {role === "leader" && membership.role !== "leader" && (
                <div className="flex flex-col gap-1">
                  <button onClick={() => setConfirmTransfer(u.id)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted" aria-label="Transfer leader">
                    <UserCog className="h-4 w-4" />
                  </button>
                  <button onClick={() => setConfirmRemove(u.id)} className="grid h-8 w-8 place-items-center rounded-lg text-destructive hover:bg-destructive/10" aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <Link to="/profile" className="mt-6 mb-2 block text-center text-sm font-medium text-primary">
          Profile & settings →
        </Link>
      </div>

      <AlertDialog open={!!confirmRemove} onOpenChange={(o) => !o && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>They'll lose access to this group's fund and history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmTransfer} onOpenChange={(o) => !o && setConfirmTransfer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer leadership?</AlertDialogTitle>
            <AlertDialogDescription>You'll become a regular member. The new leader can approve spends and manage the group.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doTransfer}>Transfer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
