import {
  IconEdit,
  IconNote,
  IconTrash,
  IconToolsKitchen2,
  IconBus,
  IconHome,
  IconShoppingBag,
  IconHeartbeat,
  IconDotsCircleHorizontal,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import type { CategoryKey } from "@/lib/categories";
import { CATEGORY_CONFIG } from "@/lib/categories";
import type { GroupExpense } from "@/lib/types";
import { formatNPR } from "@/lib/utils";

const fallbackIcons: Record<CategoryKey, ComponentType<{ className?: string }>> = {
  food: IconToolsKitchen2,
  transport: IconBus,
  rent: IconHome,
  shopping: IconShoppingBag,
  health: IconHeartbeat,
  other: IconDotsCircleHorizontal,
  income: IconDotsCircleHorizontal,
};

export function GroupExpenseCard({
  expense,
  currentUserId,
  onEdit,
  onDelete,
}: {
  expense: GroupExpense;
  currentUserId: string;
  onEdit: (expense: GroupExpense) => void;
  onDelete: (id: string) => void;
}) {
  const owner = expense.addedBy === currentUserId;
  const config = CATEGORY_CONFIG[expense.category];
  const Icon = (config.icon as ComponentType<{ className?: string }>) ?? fallbackIcons.other;
  const timeStr = new Date(expense.addedAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="rounded-[12px] border border-[0.5px] border-[var(--saj-border)] bg-white px-[14px] py-[12px]">
      <div className="flex items-center gap-2">
        <div
          className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[12px] font-medium text-[var(--saj-text)]"
          style={{ background: expense.addedByColor }}
        >
          {expense.addedByInitials}
        </div>
        <span className="text-[12px] font-medium text-[var(--saj-green)]">
          {expense.addedByName}
          {owner ? " (you)" : ""}
        </span>
        <span className="text-[12px] text-[var(--saj-muted)]">added an expense</span>
        <span className="ml-auto text-[12px] text-[var(--saj-muted)]">{timeStr}</span>
      </div>

      <div className="mt-[10px] flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: config.bg, color: config.color }}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium text-[var(--saj-text)]">{expense.title}</div>
          <span
            className="mt-1 inline-block rounded-full px-2 py-[2px] text-[11px]"
            style={{ background: config.bg, color: config.color }}
          >
            {config.label}
          </span>
        </div>

        <div className="shrink-0 text-[16px] font-medium text-[var(--saj-red)]">
          -{formatNPR(expense.amount)}
        </div>
      </div>

      {expense.notes ? (
        <div className="mt-2 flex items-start gap-1 text-[12px] italic text-[var(--saj-muted)]">
          <IconNote className="mt-[1px] h-3 w-3 shrink-0" />
          <span>{expense.notes}</span>
        </div>
      ) : null}

      {owner ? (
        <div className="mt-2 flex items-center justify-end gap-3 border-t border-[var(--saj-border-soft)] pt-2">
          <button
            type="button"
            onClick={() => onEdit(expense)}
            className="flex items-center gap-1 text-[11px] text-[var(--saj-green)]"
          >
            <IconEdit className="h-3 w-3" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(expense.id)}
            className="flex items-center gap-1 text-[11px] text-[var(--saj-red)]"
          >
            <IconTrash className="h-3 w-3" />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
