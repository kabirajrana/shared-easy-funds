import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGate } from "@/components/layout/AuthGate";
import { api } from "@/services/api";
import { Bell, CheckCircle2, XCircle, FileBarChart, AlertTriangle, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useGroupStore } from "@/store/useGroupStore";
import { toast } from "sonner";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Sajha" }] }),
  component: () => <AuthGate><Notifs /></AuthGate>,
});

const ICON = {
  request: Inbox,
  approval: CheckCircle2,
  rejection: XCircle,
  summary: FileBarChart,
  low_balance: AlertTriangle,
} as const;

function Notifs() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const joinGroup = useGroupStore((state) => state.joinGroup);
  const { data: items = [] } = useQuery({ queryKey: ["notifications"], queryFn: api.getNotifications });

  useEffect(() => {
    api.markNotificationsRead().then(() => qc.invalidateQueries({ queryKey: ["notifications"] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const acceptInvite = async (notificationId: string, inviteCode: string, groupId: string) => {
    const group = joinGroup(inviteCode);
    if (!group) {
      toast.error("Invite code is no longer available.");
      return;
    }

    await api.acceptGroupInvite(notificationId);
    toast.success("Join request accepted");
    await qc.invalidateQueries({ queryKey: ["notifications"] });
    navigate({ to: `/groups/${groupId || group.id}` });
  };

  const declineInvite = async (notificationId: string) => {
    await api.declineGroupInvite(notificationId);
    toast.message("Invite declined");
    await qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <AppShell title="Notifications" back hideNav>
      <div className="space-y-2 px-4 pt-4">
        {items.length === 0 && (
          <div className="grid place-items-center py-16 text-center text-sm text-muted-foreground">
            <Bell className="mb-2 h-8 w-8 opacity-40" />
            You're all caught up.
          </div>
        )}
        {items.map((n) => {
          const Icon = ICON[n.type] ?? Bell;
          const tone =
            n.type === "approval" ? "text-success bg-success/10" :
            n.type === "rejection" ? "text-destructive bg-destructive/10" :
            n.type === "low_balance" ? "text-warning-foreground bg-warning/20" :
            "text-primary bg-primary/10";
          return (
            <div key={n.id} className={cn("flex gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-[var(--shadow-card)]", !n.read && "ring-1 ring-primary/30")}>
              <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", tone)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{new Date(n.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</p>
                {n.meta?.kind === "group_invite" && n.meta.status === "pending" ? (
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 rounded-full px-3"
                      onClick={() => acceptInvite(n.id, n.meta!.invite_code, n.meta!.group_id)}
                    >
                      Accept invite
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-full px-3"
                      onClick={() => declineInvite(n.id)}
                    >
                      Decline
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
