import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle, Users, XCircle } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/services/api";
import { cn } from "@/lib/utils";

type NotificationLike = {
  id: string;
  type: string;
  title: string;
  body?: string;
  message?: string;
  date?: string;
  created_at?: string;
  read?: boolean;
  is_read?: boolean;
  recipient_id?: string;
  recipient_email?: string;
  data?: {
    invitationId?: string;
    groupId?: string;
    groupName?: string;
    inviterName?: string;
    inviteCode?: string;
    leaderId?: string;
    status?: "pending" | "accepted" | "declined" | "expired";
  };
  meta?: {
    kind: "group_invite";
    invitationId?: string;
    group_id?: string;
    group_name?: string;
    invite_code?: string;
    sender_id?: string;
    sender_name?: string;
    status?: "pending" | "accepted" | "rejected";
  };
};

function isRead(notification: NotificationLike) {
  return notification.read ?? notification.is_read ?? false;
}

function getInvitationId(notification: NotificationLike) {
  return notification.data?.invitationId ?? notification.meta?.invitationId;
}

function getGroupId(notification: NotificationLike) {
  return notification.data?.groupId ?? notification.meta?.group_id;
}

export function NotificationItem({ notification }: { notification: NotificationLike }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const unread = !isRead(notification);
  const invitationId = getInvitationId(notification);
  const groupId = getGroupId(notification);
  const isGroupInvite = notification.type === "group_invite" || notification.meta?.kind === "group_invite";

  const markRead = useMutation({
    mutationFn: () => api.markNotificationRead(notification.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const acceptInvite = useMutation({
    mutationFn: async () => {
      if (!invitationId) throw new Error("Missing invitation id.");
      await api.acceptGroupInvite(notification.id);
      return { groupId };
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      if (data.groupId) {
        navigate({ to: `/groups/${data.groupId}` });
      }
      toast.success("Invite accepted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not accept invite");
    },
  });

  const declineInvite = useMutation({
    mutationFn: async () => {
      if (!invitationId) throw new Error("Missing invitation id.");
      await api.declineGroupInvite(notification.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.message("Invite declined");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not decline invite");
    },
  });

  const timestamp = notification.created_at ?? notification.date ?? new Date().toISOString();

  return (
    <div
      className={cn(
        "px-4 py-3 transition-colors hover:bg-white/5",
        unread && "bg-white/5",
      )}
      onClick={() => unread && !markRead.isPending && markRead.mutate()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (unread && !markRead.isPending) markRead.mutate();
        }
      }}
    >
      <div className="flex gap-3 items-start">
        <div className="mt-0.5 p-1.5 rounded-full bg-green-400/10">
          <Users className="w-4 h-4 text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium leading-tight">{notification.title}</p>
          <p className="text-white/50 text-xs mt-0.5 leading-snug">
            {notification.message ?? notification.body}
          </p>

          {isGroupInvite ? (
            <div className="flex gap-2 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  acceptInvite.mutate();
                }}
                disabled={acceptInvite.isPending || declineInvite.isPending}
                className="flex items-center gap-1 px-3 py-1 bg-green-500 hover:bg-green-400 text-black text-xs font-semibold rounded-full transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-3 h-3" />
                Accept
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  declineInvite.mutate();
                }}
                disabled={acceptInvite.isPending || declineInvite.isPending}
                className="flex items-center gap-1 px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-full transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3 h-3" />
                Decline
              </button>
            </div>
          ) : null}

          <p className="text-white/30 text-xs mt-1.5">
            {new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {unread ? <div className="mt-2 w-2 h-2 rounded-full bg-green-400 flex-shrink-0" /> : null}
      </div>
    </div>
  );
}
