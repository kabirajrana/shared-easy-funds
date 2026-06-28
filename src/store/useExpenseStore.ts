import { create } from "zustand";
import type { Expense } from "@/types";
import { SHARED_BACKEND_ENABLED } from "@/services/sharedBackend";
import { addSharedExpenseFn, getSharedExpensesFn } from "@/lib/api/sharedStore.functions";
import { api } from "@/services/api";
import { formatCurrency } from "@/utils/formatCurrency";

const LS_CURRENT_USER = "sajha.currentUser";
const EXPENSES_KEY = "sajha.expenses";

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
  addExpense: (expense: Expense) => Promise<Expense>;
  deleteExpense: (id: string) => void;
  deleteGroupExpenses: (groupId: string) => void;
  getGroupExpenses: (groupId: string) => Expense[];
  getPersonalExpenses: (userId: string) => Expense[];
  getMonthlySummary: (userId: string) => MonthlySummary;
  hydrateWorkspace: () => Promise<void>;
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

function getCurrentUserBudget() {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(LS_CURRENT_USER);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { monthlyBudget?: number } | null;
    return typeof parsed?.monthlyBudget === "number" ? parsed.monthlyBudget : 0;
  } catch {
    return 0;
  }
}

function loadExpenses() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EXPENSES_KEY);
    return raw ? (JSON.parse(raw) as Expense[]) : [];
  } catch {
    return [];
  }
}

function persistExpenses(expenses: Expense[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
  } catch {}
}

function mergeExpenses(existing: Expense[], incoming: Expense[]) {
  const map = new Map<string, Expense>();
  for (const expense of [...existing, ...incoming]) {
    map.set(expense.id, expense);
  }
  return [...map.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: loadExpenses(),
  hydrateWorkspace: async () => {
    const localExpenses = loadExpenses();
    if (!SHARED_BACKEND_ENABLED) {
      try {
        const groups = await api.myGroups();
        const sharedExpenses = (
          await Promise.all(
            groups.map(async (group) => {
              try {
                return (await getSharedExpensesFn({ data: { groupId: group.id } })) as Expense[];
              } catch {
                return [];
              }
            }),
          )
        ).flat();
        const nextExpenses = mergeExpenses(
          localExpenses.filter((expense) => !expense.groupId),
          sharedExpenses,
        );
        persistExpenses(nextExpenses);
        set({ expenses: nextExpenses });
        return;
      } catch {
        // Fall back to the local cache if shared data is unavailable.
      }
    }

    set({ expenses: localExpenses });
  },
  resetWorkspace: () =>
    set(() => {
      persistExpenses([]);
      return { expenses: [] };
    }),
  addExpense: async (expense) => {
    if (!expense.groupId) {
      set((state) => {
        const next = { expenses: mergeExpenses([expense], state.expenses) };
        persistExpenses(next.expenses);
        return next;
      });
      return expense;
    }

    if (!SHARED_BACKEND_ENABLED) {
      const saved = (await addSharedExpenseFn({ data: { expense } })) as Expense;
      set((state) => {
        const next = { expenses: mergeExpenses([saved], state.expenses) };
        persistExpenses(next.expenses);
        return next;
      });
      return saved;
    }

    set((state) => {
      const next = { expenses: mergeExpenses([expense], state.expenses) };
      persistExpenses(next.expenses);
      return next;
    });
    return expense;
  },
  deleteExpense: (id) =>
    set((state) => {
      const next = { expenses: state.expenses.filter((expense) => expense.id !== id) };
      persistExpenses(next.expenses);
      return next;
    }),
  deleteGroupExpenses: (groupId) =>
    set((state) => {
      const next = { expenses: state.expenses.filter((expense) => expense.groupId !== groupId) };
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
    const totalSpent = relevant.filter((expense) => expense.type !== "income").reduce((sum, expense) => sum + expense.amount, 0);
    const totalIncome = relevant.filter((expense) => expense.type === "income").reduce((sum, expense) => sum + expense.amount, 0);
    const budget = getCurrentUserBudget();
    const totalSaved = totalIncome - totalSpent;
    return {
      totalSpent,
      totalIncome,
      totalSaved,
      budget,
      budgetUsed: budget > 0 ? Math.round((totalSpent / budget) * 100) : 0,
      daysLeft: 19,
      formattedSpent: formatCurrency(totalSpent),
    };
  },
}));

