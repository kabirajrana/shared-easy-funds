import { create } from "zustand";
import type { PaymentProvider, User } from "@/types";
import { demoUsers } from "@/store/seed";

type UserState = {
  currentUser: User;
  isAuthenticated: boolean;
  signIn: (user: User) => void;
  signOut: () => void;
  updateProfile: (patch: Partial<Pick<User, "name" | "avatarImage" | "avatarColor" | "initials">>) => void;
  updateBudget: (monthlyBudget: number) => void;
  updatePaymentQR: (paymentQR?: User["paymentQR"]) => void;
  setAvatarColor: (avatarColor: string) => void;
  setPaymentProvider: (provider: PaymentProvider, name: string, qrImage?: string) => void;
};

const initialUser = demoUsers[0];

export const useUserStore = create<UserState>((set) => ({
  currentUser: initialUser,
  isAuthenticated: true,
  signIn: (user) => set({ currentUser: user, isAuthenticated: true }),
  signOut: () => set({ isAuthenticated: false }),
  updateProfile: (patch) =>
    set((state) => ({
      currentUser: { ...state.currentUser, ...patch },
    })),
  updateBudget: (monthlyBudget) =>
    set((state) => ({
      currentUser: { ...state.currentUser, monthlyBudget },
    })),
  updatePaymentQR: (paymentQR) =>
    set((state) => ({
      currentUser: { ...state.currentUser, paymentQR },
    })),
  setAvatarColor: (avatarColor) =>
    set((state) => ({
      currentUser: { ...state.currentUser, avatarColor },
    })),
  setPaymentProvider: (provider, name, qrImage) =>
    set((state) => ({
      currentUser: {
        ...state.currentUser,
        paymentQR: { provider, name, qrImage },
      },
    })),
}));
