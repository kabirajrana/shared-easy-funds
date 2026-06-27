import * as Popover from "@radix-ui/react-popover";
import { useEffect } from "react";
import { Bell } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/services/api";
import { NotificationItem } from "@/components/NotificationItem";
import { useNotificationStore } from "@/stores/notificationStore";

export function NotificationBell() {
  const queryClient = useQueryClient();
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.getNotifications(),
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((notification: any) => !(notification.read ?? notification.is_read)).length;

  useEffect(() => {
    setUnreadCount(unreadCount);
  }, [setUnreadCount, unreadCount]);

  const markAllRead = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-muted" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-[20rem] overflow-hidden rounded-3xl border border-white/10 bg-[#132033] p-0 shadow-2xl"
          sideOffset={10}
          align="end"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 ? (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs font-medium text-green-400 hover:underline"
                disabled={markAllRead.isPending}
              >
                {markAllRead.isPending ? "Updating..." : "Mark all read"}
              </button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-white/50">No notifications yet</p>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map((notification: any) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
