import type { ReactNode } from "react";
import {
  IconArrowDown,
  IconBus,
  IconHome,
  IconShoppingBag,
  IconToolsKitchen2,
  IconHeartbeat,
  IconDotsCircleHorizontal,
} from "@tabler/icons-react";
import type { Category, Transaction } from "@/lib/types";
import { formatDate, formatNPR } from "@/lib/utils";
import { CATEGORY_CONFIG } from "@/lib/categories";

type Props =
  | {
      transaction: Transaction;
      isLast?: boolean;
    }
  | {
      icon: ReactNode;
      iconBg: string;
      title: string;
      date: string;
      category: string;
      amount: number;
      type: "income" | "expense";
      isLast?: boolean;
    };

const iconMap: Record<Category, ReactNode> = {
  food: <IconToolsKitchen2 className="h-4 w-4" />,
  transport: <IconBus className="h-4 w-4" />,
  rent: <IconHome className="h-4 w-4" />,
  shopping: <IconShoppingBag className="h-4 w-4" />,
  health: <IconHeartbeat className="h-4 w-4" />,
  other: <IconDotsCircleHorizontal className="h-4 w-4" />,
};

function isTransactionProp(
  props: Props,
): props is { transaction: Transaction; isLast?: boolean } {
  return "transaction" in props;
}

export function TransactionItem(props: Props) {
  const resolved = isTransactionProp(props)
    ? {
        icon:
          props.transaction.type === "income"
            ? <IconArrowDown className="h-4 w-4" />
            : iconMap[props.transaction.category],
        iconBg:
          props.transaction.type === "income"
            ? "#EAF3DE"
            : CATEGORY_CONFIG[props.transaction.category].bg,
        iconColor:
          props.transaction.type === "income"
            ? "var(--saj-green-income)"
            : CATEGORY_CONFIG[props.transaction.category].color,
        title: props.transaction.title,
        date: formatDate(props.transaction.date),
        category:
          props.transaction.type === "income"
            ? "income"
            : CATEGORY_CONFIG[props.transaction.category].label.toLowerCase(),
        amount: props.transaction.amount,
        type: props.transaction.type,
        isLast: props.isLast,
      }
    : { ...props, iconColor: undefined };

  const negative = resolved.type === "expense";

  return (
    <div
      className="flex items-center gap-3 px-[14px] py-[11px]"
      style={{
        borderBottom: resolved.isLast ? "none" : "0.5px solid var(--saj-border-soft)",
      }}
    >
      <div
        className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]"
        style={{ background: resolved.iconBg }}
      >
        <span style={{ color: resolved.iconColor ?? (negative ? "var(--saj-red)" : "var(--saj-green-income)") }}>
          {resolved.icon}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[var(--saj-text)]">
          {resolved.title}
        </p>
        <p className="truncate text-[11px] text-[var(--saj-hint)]">
          {resolved.date} · {resolved.category}
        </p>
      </div>
      <span
        className="shrink-0 text-[13px] font-medium"
        style={{
          color: negative ? "var(--saj-red)" : "var(--saj-green-income)",
        }}
      >
        {negative ? "-" : "+"}
        {formatNPR(resolved.amount)}
      </span>
    </div>
  );
}
