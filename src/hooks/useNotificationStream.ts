import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/session";
import { SHARED_BACKEND_ENABLED } from "@/services/sharedBackend";

const NOTIFICATIONS_UPDATED_EVENT = "sajha:notifications-updated";
const NOTIFICATION_EVENT = "sajha:notification";

function getNotificationStreamUrl() {
  if (SHARED_BACKEND_ENABLED) return "";
  const base = (import.meta as any).env?.VITE_API_BASE_URL ?? "";
  if (!base) return "";
  return `${base.replace(/\/$/, "")}/api/notifications/stream`;
}

export function useNotificationStream() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const retryRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "sajha.notifications" || event.key === "sajha.group_invitations") {
        refresh();
      }
    };

    const handleEvent = () => refresh();

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleEvent as EventListener);
    window.addEventListener(NOTIFICATION_EVENT, handleEvent as EventListener);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", refresh);
    const intervalId = window.setInterval(refresh, 5000);

    const streamUrl = getNotificationStreamUrl();
    let source: EventSource | null = null;
    if (streamUrl && "EventSource" in window) {
      source = new EventSource(streamUrl, { withCredentials: true });
      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as { type?: string };
          if (data.type === "notification") refresh();
        } catch {
          refresh();
        }
      };
      source.onerror = () => {
        source?.close();
        source = null;
        if (retryRef.current) window.clearTimeout(retryRef.current);
        retryRef.current = window.setTimeout(() => refresh(), 5000);
      };
    }

    refresh();

    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleEvent as EventListener);
      window.removeEventListener(NOTIFICATION_EVENT, handleEvent as EventListener);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", refresh);
      window.clearInterval(intervalId);
      source?.close();
      if (retryRef.current) window.clearTimeout(retryRef.current);
    };
  }, [queryClient, user]);
}
