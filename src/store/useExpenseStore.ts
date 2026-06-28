import { create } from "zustand";
import type { Expense } from "@/types";
import { SHARED_BACKEND_ENABLED } from "@/services/sharedBackend";
import { addSharedExpenseFn, getSharedExpensesFn } from "@/lib/api/sharedStore.functions";
import { api } from "@/services/api";
import { formatCurrency } from "@/utils/formatCurrency";

const LS_CURRENT_USER = "sajha.currentUser";
const EXPENSES_KEY = "sajha.expenses";
const EXPENSES_UPDATED_EVENT = "sajha:expenses-updated";
const EXPENSES_CHANNEL = "sajha:expenses";

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

let syncReady = false;
let expenseChannel: BroadcastChannel | null = null;

function getExpenseChannel() {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return null;
  if (!expenseChannel) {
    expenseChannel = new BroadcastChannel(EXPENSES_CHANNEL);
  }
  return expenseChannel;
}

function publishExpensesUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EXPENSES_UPDATED_EVENT));
  getExpenseChannel()?.postMessage({ type: EXPENSES_UPDATED_EVENT });
}

function setupSync(refresh: () => Promise<void>) {
  if (typeof window === "undefined" || syncReady) return;
  syncReady = true;

  const runRefresh = () => {
    void refresh();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === EXPENSES_KEY) runRefresh();
  };

  window.addEventListener("focus", runRefresh);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") runRefresh();
  });
  window.addEventListener(EXPENSES_UPDATED_EVENT, runRefresh as EventListener);
  window.addEventListener("storage", handleStorage);
  const channel = getExpenseChannel();
  if (channel) {
    channel.onmessage = (event) => {
      if (event.data?.type === EXPENSES_UPDATED_EVENT) runRefresh();
    };
  }
  window.setInterval(runRefresh, 2000);
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
        publishExpensesUpdate();
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
        publishExpensesUpdate();
        return next;
      });
      return expense;
    }

    if (!SHARED_BACKEND_ENABLED) {
      const saved = (await addSharedExpenseFn({ data: { expense } })) as Expense;
      set((state) => {
        const next = { expenses: mergeExpenses([saved], state.expenses) };
        persistExpenses(next.expenses);
        publishExpensesUpdate();
        return next;
      });
      return saved;
    }

    set((state) => {
      const next = { expenses: mergeExpenses([expense], state.expenses) };
      persistExpenses(next.expenses);
      publishExpensesUpdate();
      return next;
    });
    return expense;
  },
  deleteExpense: (id) =>
    set((state) => {
      const next = { expenses: state.expenses.filter((expense) => expense.id !== id) };
      persistExpenses(next.expenses);
      publishExpensesUpdate();
      return next;
    }),
  deleteGroupExpenses: (groupId) =>
    set((state) => {
      const next = { expenses: state.expenses.filter((expense) => expense.groupId !== groupId) };
      persistExpenses(next.expenses);
      publishExpensesUpdate();
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

setupSync(() => useExpenseStore.getState().hydrateWorkspace());

