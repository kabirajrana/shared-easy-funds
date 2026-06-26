import { create } from "zustand";
import type { Expense } from "@/types";
import { demoExpenses } from "@/store/seed";
import { formatCurrency } from "@/utils/formatCurrency";

const LS_CURRENT_USER = "sajha.currentUser";
const EXPENSES_PREFIX = "sajha.expenses";

type MonthlySummary = {
  totalSpent: number;
  totalIncome: number;
  totalSaved: number;
  budget: number;
  budgetUsed: number;
  daysLeft: number;
  formattedSpent: string;
};

type ExpenseState = {
  expenses: Expense[];
  addExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  getGroupExpenses: (groupId: string) => Expense[];
  getPersonalExpenses: (userId: string) => Expense[];
  getMonthlySummary: (userId: string) => MonthlySummary;
  hydrateWorkspace: () => void;
  resetWorkspace: () => void;
};

function getCurrentUserId() {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem(LS_CURRENT_USER);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { id?: string } | null;
    return parsed?.id ?? "";
  } catch {
    return "";
  }
}

function storageKey(userId: string) {
  return `${EXPENSES_PREFIX}:${userId || "guest"}`;
}

function loadExpenses() {
  if (typeof window === "undefined") return demoExpenses;
  const userId = getCurrentUserId();
  const allowDemoSeed = userId === "u1";
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as Expense[]) : allowDemoSeed ? demoExpenses : [];
  } catch {
    return allowDemoSeed ? demoExpenses : [];
  }
}

function persistExpenses(expenses: Expense[]) {
  if (typeof window === "undefined") return;
  const userId = getCurrentUserId();
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(expenses));
  } catch {}
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: loadExpenses(),
  hydrateWorkspace: () =>
    set(() => {
      const nextExpenses = loadExpenses();
      return { expenses: nextExpenses };
    }),
  resetWorkspace: () =>
    set(() => {
      persistExpenses([]);
      return { expenses: [] };
    }),
  addExpense: (expense) =>
    set((state) => {
      const next = { expenses: [expense, ...state.expenses] };
      persistExpenses(next.expenses);
      return next;
    }),
  deleteExpense: (id) =>
    set((state) => {
      const next = { expenses: state.expenses.filter((expense) => expense.id !== id) };
      persistExpenses(next.expenses);
      return next;
    }),
  getGroupExpenses: (groupId) => get().expenses.filter((expense) => expense.groupId === groupId),
  getPersonalExpenses: (userId) =>
    get()
      .expenses.filter((expense) => expense.paidById === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  getMonthlySummary: (userId) => {
    const relevant = get().expenses.filter((expense) => expense.paidById === userId || expense.splits.some((split) => split.userId === userId));
    const totalSpent = relevant.reduce((sum, expense) => sum + expense.amount, 0);
    const budget = 45000;
    const totalIncome = 73000;
    const totalSaved = totalIncome - totalSpent;
    return {
      totalSpent,
      totalIncome,
      totalSaved,
      budget,
      budgetUsed: Math.round((totalSpent / budget) * 100),
      daysLeft: 19,
      formattedSpent: formatCurrency(totalSpent),
    };
  },
}));

