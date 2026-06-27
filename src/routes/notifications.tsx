import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { AuthGate } from "@/components/layout/AuthGate";
import { NotificationItem } from "@/components/NotificationItem";
import { api } from "@/services/api";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Sajha" }] }),
  component: () => (
    <AuthGate>
      <Notifs />
    </AuthGate>
  ),
});

function Notifs() {
  const queryClient = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.getNotifications(),
  });

  useEffect(() => {
    api.markAllNotificationsRead().then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }));
  }, [queryClient]);

  return (
    <AppShell title="Notifications" back hideNav>
      <div className="space-y-2 px-4 pt-4">
        {items.length === 0 ? (
          <div className="grid place-items-center py-16 text-center text-sm text-muted-foreground">
            <Bell className="mb-2 h-8 w-8 opacity-40" />
            You're all caught up.
          </div>
        ) : (
          items.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))
        )}
      </div>
    </AppShell>
  );
}
