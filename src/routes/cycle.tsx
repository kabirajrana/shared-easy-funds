import { createFileRoute, Link } from "@tanstack/react-router";
import { IconPlus } from "@tabler/icons-react";
import { AuthGate } from "@/components/layout/AuthGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { CycleCard } from "@/components/features/CycleCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockCycle, mockMembers } from "@/services/mock";

export const Route = createFileRoute("/cycle")({
  head: () => ({ meta: [{ title: "Cycles — Sajha" }] }),
  component: () => (
    <AuthGate>
      <CyclePage />
    </AuthGate>
  ),
});

function CyclePage() {
  return (
    <div className="pb-6">
      <PageHeader
        title="Fund Cycles"
        rightSlot={
          <Button asChild size="icon" className="h-10 w-10 rounded-full">
            <Link to="/add">
              <IconPlus className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="px-4">
        <CycleCard cycle={mockCycle} />

        <div className="mt-4 rounded-[24px] bg-white p-4 shadow-[var(--shadow-card)]">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Participants</h3>
          <div className="mt-3 space-y-3">
            {mockMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{member.name}</p>
                  <p className="text-xs text-[var(--color-hint)]">Contribution pending this round</p>
                </div>
                <Badge variant={member.paid ? "success" : "warning"}>
                  {member.paid ? "Paid" : "Pending"}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <Button className="mt-4 h-12 w-full">New cycle</Button>
      </div>
    </div>
  );
}
