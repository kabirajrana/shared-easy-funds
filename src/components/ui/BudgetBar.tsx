import { cn } from "@/lib/utils";

export function BudgetBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-[6px] w-full overflow-hidden rounded-[3px] bg-[var(--saj-green-pale)]",
        className,
      )}
    >
      <div
        className="h-full rounded-[3px] bg-[var(--saj-green)]"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
