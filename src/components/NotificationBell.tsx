import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Popover from "@radix-ui/react-popover";
import { Bell, Sparkles } from "lucide-react";
import { api } from "@/services/api";
import { NotificationItem } from "@/components/NotificationItem";
import { useNotificationStore } from "@/store/notificationStore";

export function NotificationBell() {
  const queryClient = useQueryClient();
  const { unreadCount, setUnreadCount } = useNotificationStore();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.getNotifications(),
    refetchInterval: 30000,
  });

  useEffect(() => {
    setUnreadCount(notifications.filter((notification) => !(notification.read || notification.is_read)).length);
  }, [notifications, setUnreadCount]);

  const markAllRead = useMutation({
    mutationFn: () => api.markNotificationsRead(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setUnreadCount(0);
    },
  });

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-muted"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#0A7C53] px-1 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          className="z-50 w-[min(92vw,22rem)] overflow-hidden rounded-[24px] border border-white/10 bg-[#101827] shadow-[0_24px_50px_rgba(0,0,0,0.45)]"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Inbox</p>
              <h3 className="text-[15px] font-semibold text-white">Notifications</h3>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/10"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-[28rem] overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} compact />
              ))
            ) : (
              <div className="px-4 py-10 text-center text-[13px] text-white/45">No notifications yet</div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
