import { create } from "zustand";

type NotificationState = {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  increment: () => void;
  reset: () => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
  increment: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  reset: () => set({ unreadCount: 0 }),
}));
