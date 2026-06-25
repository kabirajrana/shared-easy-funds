import { Link } from "@tanstack/react-router";
import type { Group } from "@/types";
import { Badge } from "@/components/ui/badge";
import { getInitials, formatDate, formatMonthlyCycle } from "@/lib/utils";

export function GroupCard({ group }: { group: Group }) {
  const settled = !group.balance || group.balance === 0;
  const badgeLabel = settled ? "Settled" : group.balance && group.balance > 0 ? "Owed" : "Even";
  const statusText = settled
    ? group.statusText ?? "Settled up"
    : group.balance && group.balance > 0
      ? `They owe NPR ${group.balance.toLocaleString("en-NP")}`
      : `You owe NPR ${Math.abs(group.balance ?? 0).toLocaleString("en-NP")}`;

  return (
    <Link to={`/groups/${group.id}`} className="block">
      <div className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition active:scale-[0.99]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
              style={{ background: group.avatarColor }}
            >
              {getInitials(group.name)}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold text-[var(--saj-text)]">
                {group.name}
              </h3>
              <p className="text-[11px] text-[var(--saj-muted)]">
                {group.memberCount ?? group.memberIds.length} members · Updated {formatDate(group.lastUpdated ?? group.createdAt)}
              </p>
              <p className="mt-1 text-[11px] text-[var(--saj-muted)]">
                {group.targetDayOfMonth ? `Target day: ${group.targetDayOfMonth}${group.targetDayOfMonth % 10 === 1 && group.targetDayOfMonth !== 11 ? "st" : group.targetDayOfMonth % 10 === 2 && group.targetDayOfMonth !== 12 ? "nd" : group.targetDayOfMonth % 10 === 3 && group.targetDayOfMonth !== 13 ? "rd" : "th"} each month` : "No target day set"}
              </p>
              <p className="mt-1 text-[11px] text-[var(--saj-muted)]">
                Cycle: {formatMonthlyCycle(group.targetDayOfMonth)}
              </p>
            </div>
          </div>
          <Badge variant={badgeLabel === "Owed" ? "owed" : badgeLabel === "Settled" ? "settled" : "even"}>
            {badgeLabel}
          </Badge>
        </div>
        <p className="mt-3 text-[13px] font-medium text-[var(--saj-green)]">{statusText}</p>
      </div>
    </Link>
  );
}
