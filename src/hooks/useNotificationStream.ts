import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/session";

const NOTIFICATION_EVENT = "sajha:notification";
const NOTIFICATIONS_UPDATED_EVENT = "sajha:notifications-updated";

function isVisibleToCurrentUser(notification: any, userId?: string, email?: string) {
  const recipientId = notification?.recipient_id ?? notification?.user_id;
  const recipientEmail = (notification?.recipient_email ?? notification?.user_email)?.toLowerCase();
  const currentEmail = email?.toLowerCase();
  return (
    !recipientId ||
    recipientId === userId ||
    (!!currentEmail && recipientEmail === currentEmail)
  );
}

export function useNotificationStream() {
  const queryClient = useQueryClient();
  const { user } = useSession();

  useEffect(() => {
    if (!user) return;

    const refreshNotifications = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    const handleNotification = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!isVisibleToCurrentUser(detail, user.id, user.email)) return;

      queryClient.setQueryData(["notifications"], (old: unknown) => {
        const existing = Array.isArray(old) ? old : [];
        const next = [detail, ...existing.filter((item: any) => item?.id !== detail?.id)];
        return next;
      });
      refreshNotifications();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "sajha.notifications" || event.key === "sajha.group_invitations") {
        refreshNotifications();
      }
    };

    const handleBroadcast = () => refreshNotifications();
    const channel = "BroadcastChannel" in window ? new BroadcastChannel("sajha:notifications") : null;
    if (channel) {
      channel.onmessage = (event) => {
        if (event.data?.type === NOTIFICATIONS_UPDATED_EVENT || event.data?.type === NOTIFICATION_EVENT) {
          refreshNotifications();
        }
      };
    }

    window.addEventListener(NOTIFICATION_EVENT, handleNotification as EventListener);
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleBroadcast);
    window.addEventListener("storage", handleStorage);

    return () => {
      channel?.close();
      window.removeEventListener(NOTIFICATION_EVENT, handleNotification as EventListener);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleBroadcast);
      window.removeEventListener("storage", handleStorage);
    };
  }, [queryClient, user]);
}
