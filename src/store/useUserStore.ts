import { create } from "zustand";
import type { PaymentProvider, User } from "@/types";
import { demoUsers } from "@/store/seed";
import { api } from "@/services/api";

const LS_CURRENT_USER = "sajha.currentUser";

function loadStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_CURRENT_USER);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function saveStoredUser(user: User | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) localStorage.setItem(LS_CURRENT_USER, JSON.stringify(user));
    else localStorage.removeItem(LS_CURRENT_USER);
  } catch {}
}

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

const defaultUser = demoUsers[0];
const initialUser = loadStoredUser() ?? defaultUser;

export const useUserStore = create<UserState>((set) => ({
  currentUser: initialUser,
  isAuthenticated: true,
  signIn: (user) => {
    saveStoredUser(user);
    set({ currentUser: user, isAuthenticated: true });
  },
  signOut: () => {
    saveStoredUser(null);
    api.setCurrentUser("");
    set({ currentUser: defaultUser, isAuthenticated: false });
  },
  updateProfile: (patch) =>
    set((state) => {
      const nextUser = { ...state.currentUser, ...patch };
      saveStoredUser(nextUser);
      return { currentUser: nextUser };
    }),
  updateBudget: (monthlyBudget) =>
    set((state) => {
      const nextUser = { ...state.currentUser, monthlyBudget };
      saveStoredUser(nextUser);
      return { currentUser: nextUser };
    }),
  updatePaymentQR: (paymentQR) =>
    set((state) => {
      const nextUser = { ...state.currentUser, paymentQR };
      saveStoredUser(nextUser);
      return { currentUser: nextUser };
    }),
  setAvatarColor: (avatarColor) =>
    set((state) => {
      const nextUser = { ...state.currentUser, avatarColor };
      saveStoredUser(nextUser);
      return { currentUser: nextUser };
    }),
  setPaymentProvider: (provider, name, qrImage) =>
    set((state) => {
      const nextUser = {
        ...state.currentUser,
        paymentQR: { provider, name, qrImage },
      };
      saveStoredUser(nextUser);
      return {
        currentUser: nextUser,
      };
    }),
}));
