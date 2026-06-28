import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCircle2, CircleDashed, Inbox, Sparkles, Users, XCircle } from "lucide-react";
import { api, type Notification } from "@/services/api";
import { cn } from "@/lib/utils";
import { useGroupStore } from "@/store/useGroupStore";

const ICONS = {
  group_invite: Users,
  invite_accepted: CheckCircle2,
  invite_declined: XCircle,
  expense_added: Sparkles,
  request: Inbox,
  approval: CheckCircle2,
  rejection: XCircle,
  summary: CircleDashed,
  low_balance: Bell,
} as const;

interface Props {
  notification: Notification;
  compact?: boolean;
}

export function NotificationItem({ notification, compact }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const upsertSharedGroup = useGroupStore((state) => state.upsertSharedGroup);
  const isRead = notification.read || notification.is_read;
  const isInvite = notification.type === "group_invite" && notification.meta?.status === "pending";
  const Icon = ICONS[notification.type as keyof typeof ICONS] ?? Bell;

  const markRead = useMutation({
    mutationFn: () => api.markNotificationRead(notification.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const acceptInvite = useMutation({
    mutationFn: () => api.acceptGroupInvite(notification.id),
    onSuccess: async (group) => {
      if (group) {
        upsertSharedGroup(group);
      }
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      const groupId = group?.id ?? notification.data?.groupId ?? notification.meta?.group_id;
      if (groupId) {
        navigate({ to: `/groups/${groupId}` });
      }
    },
  });

  const declineInvite = useMutation({
    mutationFn: () => api.declineGroupInvite(notification.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const isExpenseAdded = notification.type === "expense_added";
  const expenseAmount = notification.data?.expenseAmount;
  const expenseTitle = notification.data?.expenseTitle;
  const groupName = notification.data?.groupName;
  const payerName = notification.data?.paidByName ?? notification.data?.inviterName;
  const expenseId = notification.data?.expenseId;

  return (
    <div
      onClick={() => {
        if (!isRead) markRead.mutate();
        if (isExpenseAdded && notification.data?.groupId) {
          navigate({
            to: `/groups/${notification.data.groupId}`,
            search: expenseId ? { expenseId } : undefined,
          });
        }
      }}
      className={cn(
        "block w-full border-b border-white/5 px-4 py-3 text-left transition",
        compact ? "bg-white/0 hover:bg-white/5" : "bg-white/0 hover:bg-white/5",
        !isRead && "bg-white/5",
      )}
    >
      <div className="flex gap-3">
        <div className={cn("mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full", compact ? "bg-white/10" : "bg-white/10")}>
          <Icon className="h-4 w-4 text-white/85" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white">{notification.title}</p>
          <p className="mt-0.5 text-[12px] leading-5 text-white/55">
            {notification.message ?? notification.body}
          </p>

          {isExpenseAdded ? (
            <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-[12px] font-semibold text-white">
                {expenseTitle ?? "Group expense"} {typeof expenseAmount === "number" ? `• NPR ${expenseAmount.toLocaleString("en-IN")}` : ""}
              </p>
              <p className="mt-0.5 text-[11px] text-white/55">
                {payerName ? `Paid by ${payerName}` : "Shared expense"}{groupName ? ` in ${groupName}` : ""}
              </p>
            </div>
          ) : null}

          {isInvite ? (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={acceptInvite.isPending || declineInvite.isPending}
                onClick={(event) => {
                  event.stopPropagation();
                  acceptInvite.mutate();
                }}
                className="rounded-full bg-[#0A7C53] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
              >
                Accept
              </button>
              <button
                type="button"
                disabled={acceptInvite.isPending || declineInvite.isPending}
                onClick={(event) => {
                  event.stopPropagation();
                  declineInvite.mutate();
                }}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-white/80 disabled:opacity-60"
              >
                Decline
              </button>
            </div>
          ) : null}

          <p className="mt-2 text-[10px] text-white/35">
            {new Date(notification.created_at ?? notification.date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {!isRead ? <div className="mt-2 h-2 w-2 rounded-full bg-[#0A7C53]" /> : null}
      </div>
    </div>
  );
}
