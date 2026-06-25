import type { ExpenseFeedDay, GroupExpense } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const groupExpensesByDate = (expenses: GroupExpense[]): ExpenseFeedDay[] => {
  const sorted = [...expenses].sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
  );

  const map: Record<string, GroupExpense[]> = {};
  sorted.forEach((expense) => {
    const key = formatDate(expense.date);
    if (!map[key]) map[key] = [];
    map[key].push(expense);
  });

  return Object.entries(map).map(([date, groupedExpenses]) => ({
    date,
    expenses: groupedExpenses,
  }));
};

export const isOwner = (expense: GroupExpense, currentUserId: string): boolean =>
  expense.addedBy === currentUserId;

export const totalSpent = (expenses: GroupExpense[]): number =>
  expenses.reduce((sum, expense) => sum + expense.amount, 0);

export const sumByCategory = (expenses: GroupExpense[]) => {
  const map: Record<string, number> = {};
  expenses.forEach((expense) => {
    map[expense.category] = (map[expense.category] ?? 0) + expense.amount;
  });

  return Object.entries(map)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
};
