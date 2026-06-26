import { Link } from "@tanstack/react-router";
import type { Group } from "@/lib/types";
import { formatDate, formatNPR } from "@/lib/utils";
import { SajhaAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function GroupCard({ group }: { group: Group }) {
  const positive = group.balance > 0;
  const balanceLabel =
    group.balance > 0
      ? `They owe ${formatNPR(group.balance)}`
      : group.balance < 0
        ? `You owe ${formatNPR(Math.abs(group.balance))}`
        : "Settled up";

  return (
    <Link to={`/groups/${group.id}`} className="block">
      <div className="rounded-[24px] bg-white p-4 shadow-[var(--shadow-card)] transition active:scale-[0.99]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <SajhaAvatar name={group.name} src={group.avatarImage} size="md" />
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-[var(--color-text)]">
                {group.name}
              </h3>
              <p className="text-xs text-[var(--color-hint)]">
                {group.memberCount} members · Updated {formatDate(group.lastActivity)}
              </p>
              <p className="mt-1 text-xs text-[var(--color-hint)]">
                {group.targetDate
                  ? `Target date: ${formatDate(group.targetDate)}`
                  : group.targetDayOfMonth
                    ? `Target day: ${group.targetDayOfMonth}`
                    : "No target set"}
              </p>
            </div>
          </div>
          <Badge variant={positive ? "success" : group.balance < 0 ? "danger" : "neutral"}>
            {group.balance > 0 ? "Owed" : group.balance < 0 ? "Owes" : "Even"}
          </Badge>
        </div>
        <p className="mt-3 text-sm font-medium text-[var(--color-text)]">{balanceLabel}</p>
      </div>
    </Link>
  );
}
