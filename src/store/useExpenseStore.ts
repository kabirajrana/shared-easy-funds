import { create } from "zustand";
import type { Expense } from "@/types";
import { demoExpenses } from "@/store/seed";
import { formatCurrency } from "@/utils/formatCurrency";

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
};

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: demoExpenses,
  addExpense: (expense) => set((state) => ({ expenses: [expense, ...state.expenses] })),
  deleteExpense: (id) => set((state) => ({ expenses: state.expenses.filter((expense) => expense.id !== id) })),
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

