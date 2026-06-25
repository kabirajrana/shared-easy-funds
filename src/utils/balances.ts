import type { Expense } from "@/types";

export interface BalanceEdge {
  from: string;
  to: string;
  amount: number;
}

export function calculateBalances(expenses: Expense[], memberIds: string[]) {
  const balances = new Map<string, number>();
  memberIds.forEach((id) => balances.set(id, 0));

  expenses.forEach((expense) => {
    const payerShare = balances.get(expense.paidById) ?? 0;
    balances.set(expense.paidById, payerShare + expense.amount);

    const splitTotal = expense.splits.reduce((sum, split) => sum + split.amount, 0);
    expense.splits.forEach((split) => {
      balances.set(split.userId, (balances.get(split.userId) ?? 0) - split.amount);
    });

    if (splitTotal === 0 && memberIds.length > 0) {
      const share = expense.amount / memberIds.length;
      memberIds.forEach((id) => balances.set(id, (balances.get(id) ?? 0) - share));
    }
  });

  const creditors = [...balances.entries()]
    .filter(([, value]) => value > 0.01)
    .map(([id, value]) => ({ id, value }));
  const debtors = [...balances.entries()]
    .filter(([, value]) => value < -0.01)
    .map(([id, value]) => ({ id, value: Math.abs(value) }));

  const settlements: BalanceEdge[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.value, creditor.value);

    settlements.push({ from: debtor.id, to: creditor.id, amount: Math.round(amount) });

    debtor.value -= amount;
    creditor.value -= amount;

    if (debtor.value <= 0.01) i += 1;
    if (creditor.value <= 0.01) j += 1;
  }

  return settlements;
}

