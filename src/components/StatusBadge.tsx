import { cn } from "@/lib/utils";
import type { TxStatus } from "@/services/api";

export function StatusBadge({ status }: { status: TxStatus }) {
  const styles: Record<TxStatus, string> = {
    approved: "bg-success/15 text-success",
    verified: "bg-success/15 text-success",
    pending: "bg-warning/20 text-warning-foreground",
    unverified: "bg-warning/20 text-warning-foreground",
    rejected: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wide", styles[status])}>
      {status}
    </span>
  );
}
