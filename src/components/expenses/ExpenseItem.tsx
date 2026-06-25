import type { Expense, User } from "@/types";
import { CategoryIcon } from "@/components/expenses/CategoryIcon";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/lib/utils";

export function ExpenseItem({
  expense,
  paidBy,
}: {
  expense: Expense;
  paidBy?: User;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div
        className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]"
        style={{
          background: "var(--saj-green-pale)",
          color: "var(--saj-green)",
        }}
      >
        <CategoryIcon category={expense.category} className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[var(--saj-text)]">
          {expense.description}
        </p>
        <p className="truncate text-[11px] text-[var(--saj-muted)]">
          {formatDate(expense.date)} · paid by {paidBy?.name ?? "Unknown"}
        </p>
      </div>
      <span className="shrink-0 text-[13px] font-medium text-[var(--saj-red)]">
        -{formatCurrency(expense.amount)}
      </span>
    </div>
  );
}

