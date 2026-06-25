import type { FundCycle } from "@/lib/types";
import { formatDate, formatNPR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function CycleCard({ cycle }: { cycle: FundCycle }) {
  const progress = Math.round((cycle.currentRound / cycle.totalRounds) * 100);

  return (
    <div className="rounded-[24px] bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">{cycle.name}</p>
          <p className="text-xs text-[var(--color-hint)]">
            Round {cycle.currentRound} of {cycle.totalRounds}
          </p>
        </div>
        <Badge variant="info">{progress}% complete</Badge>
      </div>
      <div className="mt-4 h-2 rounded-full bg-black/5">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-[#eef8f4] p-3">
          <p className="text-xs text-[var(--color-hint)]">Contribution</p>
          <p className="font-semibold text-[var(--color-text)]">
            {formatNPR(cycle.contributionAmount)}
          </p>
        </div>
        <div className="rounded-2xl bg-[#eef8f4] p-3">
          <p className="text-xs text-[var(--color-hint)]">Next payout</p>
          <p className="font-semibold text-[var(--color-text)]">
            {formatDate(cycle.nextPayoutDate)}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm text-[var(--color-hint)]">
        Next recipient: <span className="font-semibold text-[var(--color-text)]">{cycle.nextRecipient}</span>
      </p>
    </div>
  );
}
